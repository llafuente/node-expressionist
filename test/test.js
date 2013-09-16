(function () {
    "use strict";

    var tap = require("tap"),
        util = require("util"),
        test = tap.test,
        api = require("../index.js").api,
        types = api.types,
        express = require("express"),
        app = express(),
        request = require("request"),
        server,
        req_timeout = 250;

    test("init api", function (t) {
        api = api(app);
        t.end();
    });


    test("init get", function (t) {
        // remember to setup your own url
        api.version_pattern = "/v{version}/{uri}";

        api.get(/*version*/1, /*uri*/"", /*description*/"index")
            // define a new parameter via query
            .param("id", {type: types.number})
            // this callback handle the request
            // success or error must be called only once
            .handler(function (req, res, success, error) {

                t.notEqual(req.query.id, 0, "id is not cero");
                t.equal(req.query.id, 100, "id is 100");

                success();
            });

        api.get(1, "login", "This service create a session")
            .param("user", {type: types.string, description: "username default is the email"})
            .param("pwd", {type: types.string, description: "password for account"})
            .param("date", {type: types.date, optional: true, description: "Current date to know the timezone"})
            .response("sessionid", {type: types.string, description: "Session id, use it in 'Require user authentication' methods"})
            .handler(function (req, res, success, error) {
                console.log("#requested!", req.params, req.query);

                t.notEqual(req.query.user, "test", "user is test");
                t.equal(req.query.pwd, "test", "pwd is test");

                success({sessionid: "fmsdkljfs98chsduc8w2bc"});
            });

        function check_session(req, res, next, error) {
            if (!req.query.sessionid || req.query.sessionid != "fmsdkljfs98chsduc8w2bc") {
                return error(/*code*/401, /*string*/"session not found");
            }
            // it"s ok! continue!
            next();
        }

        api.define_hook("auth", check_session, null, {description: "required valid session"});

        api.get(1, "info")
            .hook("auth") // attach the hook
            // reference a complex type is valid for arrays and objects
            .response("list", {type: types.array, ref: ":list"})
            // define a list of types
            .response(":list", [
                {name: "name", type: types.string}
            ])
            .handler(function (req, res, success, error) {
                console.log("#requested!", req.params, req.query);

                success({list: [{name: "xxx"}, {name: "yyy"}]});
            });

        // add something to the return structure
        function add_something(res, req, ret, next, error) {
            ret.response.something = "ok";
            next(ret);
        }
        api.define_hook("add-something", null, add_something, {description: "add new field something"});

        api.get(1, "get/:what/:id")
            .hook("add-something")
            // define a new parameter via params(url)
            .param("id", {type: types.number, scope: "params"})
            .param("what", {type: types.in, values: ["food", "anything"], scope: "params"})
            // define a limit that is a number, optional and if not sent 100
            .param("limit", {type: types.number, optional: true, default: 100})

            .handler(function (req, res, success, error) {
                console.log("#requested!", req.params, req.query);

                // short way
                success({limit: req.query.limit});
            });


    api.get(1, "docs", "display the documentation")
        .handler(function (req, res, next, error) {

            var doc = [];

            api.get_uris().forEach(function (uri) {
                doc.push(api.doc(uri));
            });

            res.setHeader("Content-Type", "text/html");
            res.end(doc.join("<hr />\n\n\n"));

            next();
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

                //console.log("#res!", util.inspect(response, {depth: 0}));
                //process.exit();

                t.equal(response.statusCode, 200, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, req_timeout);

    });


    test("get:/v1/login?user=test&pwd=test", function (t) {

        setTimeout(function () {
            request.get("http://localhost:8080/v1/login?user=test&pwd=test", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, req_timeout);

    });


    test("get:/v1/info?sessionid=fmsdkljfs98chsduc8w2bc", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/info?sessionid=fmsdkljfs98chsduc8w2bc", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");
                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                }

                t.end();
            });

        }, req_timeout);

    });
    test("get:/v1/info (err)", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/info", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 401, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");

                t.end();
            });

        }, req_timeout);

    });

    test("get:/v1/get/food/1001", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/get/food/1001", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 200, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");

                if(response.statusCode == 200) {
                    var json = JSON.parse(body);
                    t.equal(json.success, true, "request is successful");
                    t.equal(json.something, "ok", "request is successful");
                    t.equal(json.limit, 100, "limit default value is 100");
                }


                t.end();
            });

        }, req_timeout);

    });



    test("get:/v1/get/food/hola (err)", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/get/food/hola", function (error, response, body) {
                console.log("#output ", body);

                t.equal(response.statusCode, 400, "return code is 200");
                t.equal(response.headers['content-type'], "application/json", " content-type is application/json");

                var json = JSON.parse(body);
                t.equal(json.success, false, "request is unsuccessful");

                t.end();
            });

        }, req_timeout);

    });


    test("get:/v1/docs", function (t) {

        setTimeout(function () {
            console.log("#requesting!");

            request.get("http://localhost:8080/v1/docs", function (error, response, body) {
                t.equal(response.statusCode, 200, "return code is 200");
                t.equal(response.headers['content-type'], "text/html", " content-type is text/html");
                //console.log(body);
                t.equal(body.length > 1000, true, "doc length is big...");

                t.end();
            });

        }, req_timeout);

    });

    test("close", function (t) {
        server.close();
        t.end();
    });
}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");