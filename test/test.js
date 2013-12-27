(function () {
    "use strict";

    var tap = require("tap"),
        util = require("util"),
        test = tap.test,
        Expresionist = require("../index.js"),
        expresionist,
        express = require("express"),
        app = express(),
        server,
        request = require("request"),
        req_timeout = 250,

        exit = process.exit;

    app.use(express.cookieParser('no-more-secrets'));
    app.use(express.bodyParser());

    test("init and attach", function (t) {
        expresionist = new Expresionist();
        expresionist.rootDir = __dirname;
        expresionist.attach(app);
        t.equal(expresionist.app, app, "app ready!");

        t.end();
    });

    test("load YML", function (t) {
        expresionist.loadYML("routes.yml", function () {
            t.equal(Object.keys(expresionist.uris.get).length, 8, "number of get uris");
            t.equal(Object.keys(expresionist.uris.post).length, 2, "number of post uris");
            t.equal(Object.keys(expresionist.uris.put).length, 0, "number of put uris");
            t.equal(Object.keys(expresionist.uris["delete"]).length, 0, "number of delete uris");
            t.end();
        });
    });

    test("call /users/login without parameters", function (t) {
        expresionist.call("/users/login", "post", {}, function (response) {
            t.equal(response.errors !== undefined, true, "has errors");
            t.equal(response.errors.length, 3, "three errors in particular");
            t.end();
        });
    });

    test("call /users/login with invalid parameters", function (t) {
        expresionist.call("/users/login", "post", {
            body: {
                username: "t",
                password: "t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464",
                timestamp: "4635618"
            }
        }, function (response) {
            t.end();
        });
    });

    test("call /users/login with parameters", function (t) {
        expresionist.call("/users/login", "post", {
            body: {
                username: "test",
                password: "test",
                timestamp: "0"
            }
        }, function (response) {
            t.equal(response.success, true, "OK!");
            t.end();
        });
    });

    test("call /test/date invalid date", function (t) {
        expresionist.call("/test/date", "get", {
            query: {
                date: "2000-12-35"
            }
        }, function (response) {
            t.equal(response.success, false, "KO");
            t.equal(response.errors.length, 1, "1 error");
            t.equal(response.errors[0].message, "invalid-input");
            t.equal(response.errors[0].long_message, "constraint [date] fail for [date]", "constraint [date] fail for [date]");

            t.end();
        });
    });

    test("call /test/date invalid date", function (t) {
        var tdate = "2000-12-01",
            ddate = new Date(tdate);
        expresionist.call("/test/date", "get", {
            query: {
                date: tdate
            }
        }, function (response) {
            t.equal(response.success, true, "KO");
            t.equal(ddate.toString(), response.date.toString(), "1 error");

            t.end();
        });
    });



    test("call /test/object-param error input", function (t) {

        expresionist.call("/test/object-param", "get", {
            query: {
                user: {
                    name: "peter"
                }
            }
        }, function (response) {
            t.equal(response.success, false, "KO");
            t.equal(response.errors.length, 1, "1 error");
            t.equal(response.errors[0].long_message, "[surname] is undefined", "[surname] is undefined");

            t.end();
        });
    });

    test("call /test/object-param error input", function (t) {

        expresionist.call("/test/object-param", "get", {
            query: {
                user: {
                    name: "peter",
                    surname: ""
                }
            }
        }, function (response) {
            t.equal(response.success, false, "KO");
            t.equal(response.errors.length, 1, "1 error");
            t.equal(response.errors[0].message, "invalid-input");
            t.equal(response.errors[0].long_message, "constraint [length] fail for [surname]", "constraint [length] fail for [surname]");

            t.end();
        });
    });

    test("call /test/object-param error input", function (t) {

        expresionist.call("/test/object-param", "get", {
            query: {
                user: {
                    name: "peter",
                    surname: "lawford"
                }
            }
        }, function (response) {
            t.equal(response.success, true, "OK");

            t.end();
        });
    });

    test("call /test/object-param2 (reference type) error input", function (t) {

        expresionist.call("/test/object-param2", "get", {
            query: {
                user: {
                    name: "peter",
                    surname: ""
                }
            }
        }, function (response) {
            t.equal(response.success, false, "KO");
            t.equal(response.errors.length, 1, "1 error");
            t.equal(response.errors[0].message, "invalid-input");
            t.equal(response.errors[0].long_message, "constraint [length] fail for [surname]", "constraint [length] fail for [surname]");

            t.end();
        });
    });

    test("call /test/continue-on-error return many errors", function (t) {

        expresionist.call("/test/continue-on-error", "get", {
            // do not send cookies, auth will fail
        }, function (response) {


            t.equal(response.success, false, "KO");
            t.equal(response.errors.length, 2, "1 error");
            t.equal(response.errors[0].message, "invalid-input");
            t.equal(response.errors[1].message, "invalid-auth");

            t.end();
        });
    });

    test("call /date-diff", function (t) {

        expresionist.call("/date-diff", "get", {
            // do not send cookies, auth will fail
            query: {
                date: "2013-01-01 12:00:00"
            }
        }, function (response) {
            t.equal(response.success, true, "success!");
            t.equal(response.diff, -3600000, "-1hour (ms)");


            t.end();
        });
    });

    test("call /server-date", function (t) {

        expresionist.call("/server-date", "get", {
        }, function (response) {

            t.equal(response.success, true, "success!");
            t.equal(response.date.getTime(), (new Date("2013-01-01 13:00:00")).getTime(), "");


            t.end();
        });
    });

    test("call /server-bad-date", function (t) {

        expresionist.call("/server-bad-date", "get", {
        }, function (response) {

            t.equal(response.success, false, "success!");
            t.equal(response.errors[0].message, "invalid-output", "invalid-input message");

            t.end();
        });
    });

    test("generate documentation", function (t) {

        expresionist.exportDoc("doc.html");
        t.end();
    });

    test("listen", function (t) {
        server = expresionist.listen(8081);
        t.end();
    });

    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");
