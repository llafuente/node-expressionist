# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)
==========

## Introduction
============

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs

What that means?
Means that you write the API interface (parameters, hooks, and response) and Expressionist do the rest! (eventually, when finished :P)


## ATM do not use this, I will remove this comment when the API is stable and ready to use. It's still experimental.
============

## NPM
============

``` bash
npm install apis-expressionist
```


## API to write APIs!
=====================

``` js

var api = require("apis-expressionist").api,
    types = api.types,
    express = require("express"),
    app = express();

api = api(app);

// define your end point format.
// version can be removed but it's really recommended
api.version_pattern = "/v{version}/{uri}";


// login example FTW
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


```