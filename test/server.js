'use strict';

const http = require('http');
const server = require('express')();

const listenPort = 8888;

// route for checking if the server is up
server.get('/alive', (req, res, next) => {
    res.send('OK');
    res.end();
});

// route for receiving a response after a specific delay
server.get('/delay/:delay', (req, res, next) => {
    const delay = parseInt(req.params.delay);
    if (!delay) {
        next(new Error(`Invalid delay: ${req.params.delay}`));
        return;
    }
    setTimeout(() => {
        res.send(delay.toString());
    }, delay);
});

// route for receiving a response after a random delay
server.get('/random', (req, res, next) => {
    const delay = Math.ceil(Math.random() * 500);
    setTimeout(() => {
        res.send(delay.toString());
    }, delay);
});

// route for deliberately not responding, closing the connection after a long time
server.get('/silence', (req, res, next) => {
    setTimeout(() => {
        res.end();
    }, 65*1000*1000)
});

module.exports = {
    start : function () {
        return new Promise((fulfill, reject) => {
            server.listen(listenPort, (err) => {
                if (err && err.message.match(/EADDRINUSE/gi)) {
                    fulfill();
                    return;
                } else if (err) {
                    reject(err);
                    return;
                }
                console.log(`Test server listening on port ${listenPort}`);
                fulfill();
            })
        });
    }
};