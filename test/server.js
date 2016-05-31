'use strict';

const http = require('http');

const server = new http.createServer(function (req, res) {
    const delay = Math.ceil(Math.random() * 500);
    setTimeout(function () {
        res.writeHead(200, {'Content-Type' : "text/plain"});
        res.write("OK. Delay: " + delay);
        res.end();
    }, delay);
});

server.listen(8888);