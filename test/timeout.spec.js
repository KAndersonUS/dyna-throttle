'use strict';

const expect = require('chai').expect;
const http = require('http');
const server = require('./server');
const throttle = require('./../index.js');

const port = server.port;

beforeEach(() => {
    return server.start()
});

describe('Handling of timed out promises', function () {
    it('Should timeout the bad request and process the next promise', function (done) {
        let requestedDelay = 10;
        let responseSum = 0;

        throttle.setTimeout(request, 3000).then(function () {
            throttle(request, `/delay/${requestedDelay}`, onFulfill, onReject);
            throttle(request, `/silence`, onFulfill, onReject);
            throttle(request, `/delay/${requestedDelay}`, onFulfill, onReject);
        });

        setTimeout(() => {
            expect(responseSum).to.eql(requestedDelay*2);
            done();
        }, 5000);


        function onFulfill(requestedDelay) {
            responseSum += parseInt(requestedDelay);
        }

        function onReject(err) {
            expect(!!err.message.match('Promise timed out')).to.be.true;
        }
    });
});

function request (path) {
    return new Promise((fulfill, reject) => {
        http.get(`http://localhost:${port}${path}`, (res) => {
            let body = '';
            res.on('error', reject);
            res.on('data', function (data) {
                body += data;
            });
            res.on('end', function () {
                fulfill(body);
            })
        });
    });
}