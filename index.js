'use strict';

const crypto = require('crypto');
const ResponseTimer = require('./lib/ResponseTimer.js');
const EventEmitter = require('events').EventEmitter;

module.exports = exports = new DynaThrottle();

function DynaThrottle () {
    const execTimer = new ResponseTimer();
    var stacks = {};

    var emitter = new EventEmitter();

    function main (promise, data, onFulfill, onReject) {
        const promiseFunc = promise.bind({});
        var namespace = promiseFunc.name.substring(6);
        if (!stacks.hasOwnProperty(namespace)) {
            stacks[namespace] = {
                timer : new ResponseTimer(),
                last : new Date(),
                lastId : null,
                factor : 10,
                stack : []
            }
        }
        var id = newId();
        stacks[namespace].stack.push(id);
        emitter.on(id, function () {
            const key = stacks[namespace].timer.start();
            promiseFunc(data).then(function (data) {
                stacks[namespace].timer.stop(key);
                stacks[namespace].last = new Date();
                stacks[namespace].stack.shift();
                onFulfill(data);
            }).catch(function (err) {
                stacks[namespace].timer.stop(key);
                stacks[namespace].last = new Date();
                stacks[namespace].stack.shift();
                onReject(err);
            });
        });
        return null;
    }

    main.getDelay = function (namespace) {
        return new Promise(function (fulfill, reject) {
            createNamespaceIfNotExists(namespace)
                .then(function (ns) {
                    fulfill(stacks[ns].timer.getAverage() * stacks[ns].factor);
                }).catch(reject);
        })
    };

    main.setFactor = function (namespace, factor) {
        return new Promise(function (fulfill, reject) {
            if (typeof factor !== 'number' || factor < 1) {
                reject(new Error('invalid factor passed to setFactor: ' + factor + ' (must be >= 1)'));
                return;
            }
            createNamespaceIfNotExists(namespace)
                .then(function (namespace) {
                    stacks[namespace]['factor'] = factor;
                }).catch(reject);
        });
    };

    main.setMaxSamples = function (namespace, maxSamples) {
        return new Promise(function (fulfill, reject) {
            if (typeof maxSamples !== 'number' || maxSamples < 2) {
                reject(new Error('invalid maxSamples passed to setMaxSamples: ' + maxSamples + ' (must be >= 2)'));
                return;
            }
            createNamespaceIfNotExists(namespace)
                .then(function (namespace) {
                    fulfill(stacks[namespace]['timer'].setMaxSamples(maxSamples));
                }).catch(reject);
        })
    };

    main.setTimeout = function (namespace, timeout) {
        return new Promise(function (fulfill, reject) {
            if (typeof timeout !== 'number' || timeout < 0) {
                reject(new Error('invalid timeout passed to setTimeout: ' + timeout + ' (must be >= 0)'));
                return;
            }
            createNamespaceIfNotExists(namespace)
                .then(function (namespace) {
                    fulfill(stacks[namespace]['timer'].setTimeout(timeout));
                }).catch(reject);
        })
    };

    function createNamespaceIfNotExists (namespace) {
        var ns = '';
        switch (typeof namespace) {
            case 'function':
                ns = namespace.name;
                break;
            case 'string':
                ns = namespace;
                break;
            default:
                break;
        }
        return new Promise(function (fulfill, reject) {
            try {
                if (!stacks.hasOwnProperty(ns)) {
                    stacks[ns] = {
                        timer : new ResponseTimer(),
                        last : new Date(),
                        lastId : null,
                        factor : 10,
                        stack : []
                    }
                }
            } catch (err) {
                reject(err);
                return;
            }
            fulfill(ns);
        })
    }

    (function run () {
        var timer = execTimer.start();
        for (let prop in stacks) {
            if (stacks.hasOwnProperty(prop)) {
                var t = stacks[prop].timer;
                var last = stacks[prop].last.getTime();
                var factor = stacks[prop].factor;
                var avg = t.getAverage();

                if (avg * factor > Date.now() - last) {
                    continue;
                }

                var id = stacks[prop].stack[0];
                if (!id) {
                    continue;
                }
                if (!stacks[prop].lastId) {
                    stacks[prop].lastId = id;
                    emitter.emit(id);
                    continue;
                }
                if (id !== stacks[prop].lastId) {
                    emitter.emit(id);
                    stacks[prop].lastId = id;
                }
            }
        }
        execTimer.stop(timer);
        setTimeout(run, execTimer.getAverage()*10);
    })();

    return main;
}

function newId () {
    var hash = new crypto.createHash('md5');
    hash.update(Math.random().toString() + Date.now());
    return hash.digest('hex');
}