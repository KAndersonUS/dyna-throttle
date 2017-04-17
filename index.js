'use strict';

const crypto = require('crypto');
const ResponseTimer = require('./lib/ResponseTimer.js');
const EventEmitter = require('events').EventEmitter;

module.exports = exports = new DynaThrottle();

function DynaThrottle () {
    const execTimer = new ResponseTimer();
    const emitter = new EventEmitter();
    let stacks = {};

    function main (promise, data, onFulfill, onReject) {
        if (typeof promise !== 'function') {
            throw new Error('dyna-throttle: first argument must be a function that returns a Promise');
        }
        const promiseFunc = promise.bind({});
        let namespace = promise.name;
        createNamespaceIfNotExists(namespace).then(() => {
            let id = newId();
            stacks[namespace].stack.push(id);

            emitter.on(id, function () {
                const key = stacks[namespace].timer.start();

                // remove timed out promises when the timer emits a timeout event
                // This pattern is the reverse of typical events - timer id is the event name
                stacks[namespace].timer.on(key, function (event) {
                    switch (event) {
                        case 'timeout':
                            complete();
                            onReject(new Error(`Promise timed out after ${stacks[namespace].timer.getTimeout()}ms (namespace: ${namespace})`))
                    }
                });

                // execute the promise function when it's time to execute
                promiseFunc(data).then(function (data) {
                    complete();
                    onFulfill(data);
                }).catch(function (err) {
                    complete();
                    onReject(err);
                });

                function complete () {
                    stacks[namespace].timer.stop(key);
                    stacks[namespace].last = new Date();
                    stacks[namespace].stack.shift();
                }
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
        let ns = '';
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
        let timer = execTimer.start();
        for (let prop in stacks) {
            if (stacks.hasOwnProperty(prop)) {
                let t = stacks[prop].timer;
                let last = stacks[prop].last.getTime();
                let factor = stacks[prop].factor;
                let avg = t.getAverage();

                if (avg * factor > Date.now() - last) {
                    continue;
                }

                let id = stacks[prop].stack[0];
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
    let hash = new crypto.createHash('md5');
    hash.update(Math.random().toString() + Date.now());
    return hash.digest('hex');
}