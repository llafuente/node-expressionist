(function () {
    "use strict";
    require('ass')

    var tap = require("tap"),
        util = require("util"),
        test = tap.test,
        Expresionist = require("../index.js"),
        expresionist,
        express = require("express"),
        bodyParser = require("body-parser"),
        cookieParser = require('cookie-parser'),
        app = express(),
        router = express.Router(),
        server,
        request = require("request"),
        req_timeout = 250,

        exit = process.exit;

    app.use(cookieParser('no-more-secrets'));
    app.use(bodyParser());

    test("init and attach", function (t) {
        expresionist = new Expresionist(app, router);
        expresionist.rootDir = __dirname;
        t.equal(expresionist.app, app, "app ready!");

        t.end();
    });

    test("load YML", function (t) {
        expresionist.loadYML("routes.yml", "test", function () {
            t.equal(Object.keys(expresionist.uris.get).length, 8, "number of get uris");
            t.equal(Object.keys(expresionist.uris.post).length, 2, "number of post uris");
            t.equal(Object.keys(expresionist.uris.put).length, 0, "number of put uris");
            t.equal(Object.keys(expresionist.uris["delete"]).length, 0, "number of delete uris");
            t.end();
        });
    });

    test("listen", function (t) {
        server = expresionist.listen(8666);
        t.end();
    });

    test("call /users/login without parameters", function (t) {
        expresionist.call("post", {
            url:"/users/login"
        }, function (err, response, body) {
            t.equal(body.errors !== undefined, true, "has errors");
            t.equal(body.errors.length, 3, "three errors in particular");
            t.end();
        });
    });

    test("call /users/login with invalid parameters", function (t) {
        expresionist.call("post", {
            url: "/users/login",
            body: {
                username: "t",
                password: "t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464t168165d1f6sd8f1sd68f1sd6f8ds4f16s841s6df51sd6f8sd1f6d5f16s8d4f16sd51fd6s546464",
                timestamp: "4635618"
            }
        }, function (err, response, body) {
            t.equal(body.success, false);
            t.equal(body.errors.length, 2);
            t.end();
        });
    });

    test("call /users/login with parameters", function (t) {
        expresionist.call("post", {
            url: "/users/login",
            body: {
                username: "test",
                password: "test",
                timestamp: "0"
            }
        }, function (err, response, body) {

            t.equal(body.success, true, "OK!");
            t.end();
        });
    });

    test("call /test/date invalid date", function (t) {
        expresionist.call("get", {
            url: "/test/date",
            query: {
                date: "2000-12-35"
            }
        }, function (err, response, body) {
            t.equal(body.success, false, "KO");
            t.equal(body.errors.length, 1, "1 error");
            t.equal(body.errors[0].message, "invalid-input-query");
            t.equal(body.errors[0].long_message, "constraint [date] fail", "constraint [date] fail");

            t.end();
        });
    });

    test("call /test/date invalid date", function (t) {
        var tdate = "2000-12-01",
            ddate = new Date(tdate);

        expresionist.call("get", {
            url: "/test/date",
            query: {
                date: tdate
            }
        }, function (err, response, body) {
            t.equal(body.success, true, "KO");

            t.equal(JSON.parse(JSON.stringify(ddate)), body.date, "1 error");

            t.end();
        });
    });

    test("call /test/object-param error input", function (t) {

        expresionist.call("get", {
            url: "/test/object-param",
            query: {
                user: {
                    name: "peter"
                }
            }
        }, function (err, response, body) {
            t.equal(body.success, false, "KO");
            t.equal(body.errors.length, 1, "1 error");
            t.equal(body.errors[0].long_message, "user.surname is undefined", "[surname] is undefined");

            t.end();
        });
    });

    test("call /test/object-param error input", function (t) {

        expresionist.call("get", {
            url: "/test/object-param",
            query: {
                user: {
                    name: "peter",
                    surname: ""
                }
            }
        }, function (err, response, body) {
            t.equal(body.success, false, "KO");
            t.equal(body.errors.length, 1, "1 error");
            t.equal(body.errors[0].message, "invalid-input-query");
            t.equal(body.errors[0].long_message, "constraint [length] fail", "constraint [length] fail");

            t.end();
        });
    });

    test("call /test/object-param error input", function (t) {

        expresionist.call("get", {
            url: "/test/object-param",
            query: {
                user: {
                    name: "peter",
                    surname: "lawford"
                }
            }
        }, function (err, response, body) {
            t.equal(body.success, true, "OK");

            t.end();
        });
    });

    test("call /test/object-param2 (reference type) error input", function (t) {

        expresionist.call("get", {
            url: "/test/object-param2",
            query: {
                user: {
                    name: "peter",
                    surname: ""
                }
            }
        }, function (err, response, body) {
            t.equal(body.success, false, "KO");
            t.equal(body.errors.length, 1, "1 error");
            t.equal(body.errors[0].message, "invalid-input-query");
            t.equal(body.errors[0].long_message, "constraint [length] fail", "constraint [length] fail");

            t.end();
        });
    });

    test("call /test/continue-on-error return many errors", function (t) {

        expresionist.call("get", {
            url: "/test/continue-on-error"
            // do not send cookies, auth will fail
        }, function (err, response, body) {
            t.equal(body.success, false, "KO");
            t.equal(body.errors.length, 2, "1 error");
            t.equal(body.errors[0].message, "invalid-input-query");
            t.equal(body.errors[1].message, "invalid-auth");

            t.end();
        });
    });

    test("call /date-diff", function (t) {

        expresionist.call("get", {
            "url": "/date-diff",
            // do not send cookies, auth will fail
            query: {
                date: "2013-01-01 12:00:00"
            }
        }, function (err, response, body) {
            t.equal(body.success, true, "success!");
            t.equal(body.diff, -3600000, "-1hour (ms)");


            t.end();
        });
    });

    test("call /server-date", function (t) {

        expresionist.call("get", {
            url: "/server-date"
        }, function (err, response, body) {

            t.equal(body.success, true, "success!");
            t.equal(new Date(body.date).getTime(), (new Date("2013-01-01 13:00:00")).getTime(), "");


            t.end();
        });
    });

    test("call /server-bad-date", function (t) {

        expresionist.call("get", {
            url: "/server-bad-date"
        }, function (err, response, body) {
            t.equal(body.success, false, "success!");
            t.equal(body.errors[0].message, "invalid-output", "invalid-input message");

            t.end();
        });
    });

    test("call /users/login-alt", function (t) {

        expresionist.call("post", {
            url: "/users/login-alt",
            query: {
                username: "user-test"
            },
            body: {
                password: "pwd-test"
            }
        }, function (err, response, body) {

            t.equal(body.success, true, "success!");
            t.equal(body.username, "user-test", "username is the given one");
            t.equal(body.password, "pwd-test", "password is the given one");

            t.end();
        });
    });



    test("call /users/login-alt", function (t) {

        var client = expresionist.getNodeClient("http://localhost:8666");

        client.test.usersLoginAlt({
                username: "user-test"
            },{
                password: "pwd-test"
            }, function (err, response, body) {

            t.equal(body.success, true, "success!");
            t.equal(body.username, "user-test", "username is the given one");
            t.equal(body.password, "pwd-test", "password is the given one");

            t.end();
        })

    });






    test("generate documentation", function (t) {
        expresionist.saveDoc("doc.html");
        t.end();
    });

    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");
