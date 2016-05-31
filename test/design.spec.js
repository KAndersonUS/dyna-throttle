"use strict";

const http = require('http');
const throttle = require('./../index.js');

// start test http server
require('./server.js');

function makeRequest (port) {
    return new Promise(function (fulfill, reject) {
        http.get('http://localhost:' + port, function (res) {
            var body = '';
            res.on('error', reject);
            res.on('data', function (data) {
                body += data;
            });
            res.on('end', function () {
                fulfill(body);
            })
        })
    });
}

for (let i=0; i<1000; i++) {
    throttle(makeRequest, 8888, onFulfill, onReject);
}

function onFulfill (body) {
    console.log(body);
    throttle.getDelay(makeRequest).then(function (delay) {
        console.log('avg delay: ' + delay);
    });
}

function onReject () {
    console.error(err.stack);
    console.log('avg delay: ' + throttle.getDelay(makeRequest));
}