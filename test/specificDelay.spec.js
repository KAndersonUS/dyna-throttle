'use strict';

const expect = require('chai').expect;
const http = require('http');
const server = require('./server');
const throttle = require('./../index.js');

const port = server.port;
const startFactor = 1;
const endFactor = 10;
const startDesiredDelay = 25;
const endDesiredDelay = 300;

beforeEach(() => {
    return server.start()
});

function generateTest (desiredDelay, factor) {
    (function () {
        describe(`Handling factor of ${factor} & desired delay of ${desiredDelay}`, function () {
            const factorizedDelay = factor * desiredDelay;
            let iterations = Math.ceil(3000/factorizedDelay);
            if (iterations < 5) {
                iterations = 5;
            }

            // create unique namespaces for each test, otherwise they will share the makeRequest namespace
            const makeRequestContainer = {
                [`makeRequest_${desiredDelay}_${factor}`] : function (delay) {
                    return new Promise(function (fulfill, reject) {
                        http.get(`http://localhost:${port}/delay/${delay}`, function (res) {
                            let body = '';
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
            };

            it(`Should make requests with an average delay of at least ${desiredDelay*factor}ms`, function (done) {
                const makeRequest = makeRequestContainer[`makeRequest_${desiredDelay}_${factor}`];
                // set the factor for dyna-throttle
                throttle.setFactor(makeRequest, factor);

                let completedRequests = 0;

                for (let i=0; i<iterations; i++) {
                    throttle(makeRequest, desiredDelay, onFulfill, onReject);
                }

                function onFulfill () {
                    completedRequests++;
                    if (completedRequests === iterations) {
                        throttle.getDelay(makeRequest).then((measuredDelay) => {
                            console.log(`Measured Delay: ${measuredDelay}, Desired Factorized Delay: ${factorizedDelay}`);
                            // expect the measured delay to be within 10% of the desired delay
                            expect(measuredDelay).to.be.at.least(factorizedDelay);
                            expect(measuredDelay).to.be.at.most(factorizedDelay*2);
                            done();
                        }).catch(done);
                    }
                }

                function onReject (err) {
                    completedRequests++;
                    console.error(err);
                }
            });
        });
    })();
}

for (let factor=startFactor; factor<=endFactor; factor++) {
    for (let desiredDelay=25; desiredDelay<=endDesiredDelay; desiredDelay+=Math.round((endDesiredDelay-startDesiredDelay)/10)) {
        generateTest(desiredDelay, factor);
    }
}