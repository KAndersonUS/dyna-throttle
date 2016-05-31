# dyna-throttle

## About
dyna-throttle is a simple module for dynamically throttling Promises
in node.js.

## Install

`npm install dyna-throttle`

## Usage
Include dyna-throttle with `require('dyna-throttle')`. dyna-throttle is returned as
a singleton.

Pass dyna-throttle a function that returns a Promise, along with a data object (to
  pass to the Promise),
onFulfill function and onReject function, like so:

`throttle(myPromiseFunc, data, fulfill, reject);`

dyna-throttle will add your Promise to its queue and automatically delay
execution of the next promise in the queue based on execution time and factor.

Queues are namespaced based on the name of the function passed in.

## Example
Inspiration for this module was making regular HTTP requests without bogging down
the web server, even if that server is under heavy load.

With a request function such as this:
```
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
```

We can schedule 1,000 requests immediately with:
```
for (let i=0; i<1000; i++) {
    throttle(makeRequest, 8888, onFulfill, onReject);
}
```
As a result, the requests are executed as quickly or as slowly as the server
responds and as you decide (via factor), without having to pick an arbitrary
delay interval.

## Methods
All methods return a Promise. `namespace` can be a string or the function
you are referring to.

`setFactor(namespace, factor)` - Sets multiplier of average execution time.

`setMaxSamples(namespace, maxSamples)` - Sets number of timings to keep in the
log to be used for averaging.

`setTimeout(namespace, timeout)` - Sets max length (ms) a timer will be kept active

`getDelay(namespace)` - Gets the average delay - including factor - for
the given namespace.

*Note: If a namespace has not yet been registered when calling any of the above
methods, it will be created.*

### Defaults
- Factor: 10
- maxSamples: 50
- timeout: 60000

## TODO
- custom namespaces
- plain function support
- Promise chaining

## License
Copyright (c) 2016, Kyle Anderson <mail@kyleanderson.us>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
