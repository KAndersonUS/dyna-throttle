'use strict';

const crypto = require('crypto');

module.exports = ResponseTimer;

function ResponseTimer () {
    var self = this;
    // tracks response times (in ms) of n number of response times

    var config = {
        maxSamples : 50, // max number of entries to keep in the log
        timeout : 60000   // max length (ms) a timer will be kept active
    };
    // running log of response times
    var log = [];
    // active timers
    var active = {};

    // clean up active regularly based on config.timeout
    (function clearTimedOut () {
        for (let timer in active) {
            if (active.hasOwnProperty(timer)) {
                if (Date.now() - active[timer].getTime() > config.timeout) {
                    delete active[timer];
                }
            }
        }
        setTimeout(clearTimedOut, 1000);
    })();

    // start a timer, returning a hash for later
    this.start = function () {
        const now = new Date();
        let hash = crypto.createHash('md5');
        hash.update(now.toISOString() + Math.random());
        const hashString = hash.digest('hex');
        active[hashString] = now;
        return hashString;
    };

    // stop a timer
    this.stop = function (hash) {
        if (!active.hasOwnProperty(hash)) {
            return null;
        }
        let diff = Date.now() - active[hash].getTime();
        diff = diff < 1 ? 1 : diff;
        self.wrap(diff);
        delete active[hash];
        return diff;
    };

    // get average times measured
    this.getAverage = function () {
        if (!log.length) {
            return 1;
        }
        if (log.length === 1) {
            return log[0];
        }
        return log.reduce(function (a,b) {
            return (a + b);
        }) / log.length;
    };

    // manual method for adding ms to the log
    this.wrap = function (ms) {
        if (typeof ms !== 'number' || ms < 0) {
            return null;
        }
        if (log.length >= config.maxSamples) {
            log.shift();
        }
        log.push(ms);
    };

    // convenience method for checking up on running timer
    this.getTime = function (hash) {
        if (!active.hasOwnProperty(hash)) {
            return null;
        }
        return Date.now() - active[hash].getTime();
    };

    // configuration methods
    this.setTimeout = function (ms) {
        if (typeof ms !== 'number' || ms < 0) {
            throw new Error('setTimeout requires a valid ms value');
        }
        config.timeout = ms;
        return config.timeout;
    };

    this.setMaxSamples = function (maxSamples) {
        if (typeof maxSamples !== 'number' || maxSamples < 2) {
            throw new Error('setMaxSamples requires a number >= 2');
        }
        config.maxSamples = maxSamples;
        return config.maxSamples;
    };

    return this;
}