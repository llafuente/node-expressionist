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
        expresionist.loadYML("routes.yml", function() {
            t.end();
        });
    });

    test("call /users/login without parameters", function(t) {
        expresionist.call("/users/login", "post", {}, function(response) {
            console.log("/users/login", response);
            t.equal(response.errors !== undefined, true, "has errors");
            t.equal(response.errors.length, 3, "three errors in particular");
            t.end();
        });
    });

    test("call /users/login with invalid parameters", function(t) {
        expresionist.call("/users/login", "post", {
            body: {
                username: "t",
                password: "t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464",
                timestamp: "4635618"
            }
        }, function(response) {
            console.log("WTF!", response);
            t.end();
        });
    });

    test("call /users/login with parameters", function(t) {
        expresionist.call("/users/login", "post", {
            body: {
                username: "test",
                password: "test"
            }
        }, function(response) {
            console.log("WTF!", response);

            t.end();
        });
    });

    test("listen", function(t) {
        server = expresionist.listen(8081);
        t.end();
    });

    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");