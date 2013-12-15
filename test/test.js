(function () {
    "use strict";

    var tap = require("tap"),
        util = require("util"),
        test = tap.test,
        expresionist = require("../index.js"),
        express = require("express"),
        app = express(),
        server,
        request = require("request"),
        req_timeout = 250,


        exit = process.exit;

    test("init and attach", function (t) {
        expresionist = new expresionist();
        expresionist.rootDir = __dirname
        expresionist.attach(app);
        t.equal(expresionist.app, app, "app ready!");

        t.end();
    });

    test("load YML", function (t) {
        expresionist.loadYML("test/routes.yml", function() {
            t.end();
        });
    });

    test("call /users/login without parametes", function(t) {
        expresionist.call("/users/login", "post", {}, function(response) {
            console.log("WTF!", response);
            t.end();
        });
    });

    test("listen", function(t) {
        server = expresionist.listen(8080);
        t.end();
    });

    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");