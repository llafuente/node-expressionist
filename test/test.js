(function () {
    "use strict";

    var tap = require("tap"),
        test = tap.test,
        api = require("../index.js").api,
        types = api.types,
        express = require("express"),
        app = express(),
        request = require("request"),
        server;

    test("init api", function (t) {
        api = api(app);
        t.end();
    });


    test("init get", function (t) {
        // remember to setup your own url
        api.version_pattern = "/v{version}/{uri}";

        api.get(1, "")
            .param("id", {type: types.number})
            .handler(function (req, res, next) {
                console.log("#requested!", req.params, req.query);

                t.notEqual(req.query.id, 0, "id is not cero");
                t.equal(req.query.id, 100, "id is 100");

                next({
                    code: 200,
                    response: {success: true}
                });
            });

        api.get(1, "login", "This service create a session")
            .param("user", {type: types.string, description: "username default is the email"})
            .param("pwd", {type: types.string})
            .param("date", {type: types.string, optional: true})
            .response("sessionid", {type: types.string})
            .handler(function (req, res, next) {
                console.log("#requested!", req.params, req.query);

                t.notEqual(req.query.user, "test", "user is test");
                t.equal(req.query.pwd, "test", "pwd is test");

                next({
                    code: 200,
                    response: {success: true, sessionid: "fmsdkljfs98chsduc8w2bc"}
                });
            });

        function check_session(req, res, next) {
            if (!req.query.sessionid || req.query.sessionid != "fmsdkljfs98chsduc8w2bc") {
                return next({
                    code: 401,
                    response: {success: false, error: "session not found"}
                });
            }
            // it"s ok!
            next(true);
        }

        api.define_hook("auth", check_session, null, {description: "required valid session"});

        api.get(1, "info")
            .hook("auth")
            .response("list", {type: types.array, ref: ":list"})
            .response(":list", [{
                name: "name",
                type: types.string
            }])
            .handler(function (req, res, next) {
                console.log("#requested!", req.params, req.query);

                // short way
                next({success: true, list: [{name: "xxx"}, {name: "yyy"}]});
            });

        function add_something(res, req, ret, next) {
            ret.response.something = "ok";
            next(ret);
        }
        api.define_hook("add-something", null, add_something, {description: "add new field something"});

        api.get(1, "get/:id")
            .hook("add-something")
            .param("id", {type: types.number, scope: "params"})
            .param("limit", {type: types.number, optional: true, default: 100})
            .handler(function (req, res, next) {
                console.log("#requested!", req.params, req.query);

                // short way
                next({success: true, limit: req.query.limit});
            });


        //debug: console.log(api.methods());


        t.end();
    });

    test("listen", function (t) {
        server = app.listen(8080);

        t.end();
    });

    test("get:/v1/?id=100", function (t) {

        setTimeout(function () {
            request.get("http://localhost:8080/v1/?id=100", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, 1000);

    });
    test("get:/v1/login?user=test&pwd=test", function (t) {

        setTimeout(function () {
            request.get("http://localhost:8080/v1/login?user=test&pwd=test", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, 1000);

    });


    test("get:/v1/info?sessionid=fmsdkljfs98chsduc8w2bc", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/info?sessionid=fmsdkljfs98chsduc8w2bc", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, 1000);

    });
    test("get:/v1/info (err)", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/info", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 401, "return code is 200");

                t.end();
            });

        }, 1000);

    });

    test("get:/v1/get/1001", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/get/1001", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                    t.equal(json.something, "ok", "request is successful");
                    t.equal(json.limit, 100, "limit default value is 100");
                }


                t.end();
            });

        }, 1000);

    });



    test("get:/v1/get/hola (err)", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/get/hola", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 400, "return code is 200");
                var json = JSON.parse(body);
                t.equal(json.success, false, "request is unsuccessful");

                t.end();
            });

        }, 1000);

    });


    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");