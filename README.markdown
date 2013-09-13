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
npm install expressionist
```


## API to write APIs!
=====================

``` js

var api = require("expressionist").api,
    types = api.types,
    express = require("express"),
    app = express();

api = api(app);

// define your end point format.
// version can be removed but it's really recommended
api.version_pattern = "/v{version}/{uri}";


// login example FTW
api.get(1, "login", "This service create a session for our api")
    //define parameters
    .param("user", {type: types.string, description: "Username default is the email"})
    .param("pwd", {type: types.string, description: "Password, must be an md5, we dont want to see the password in our access log..."})

    // define response metadata
    .response("sessionid", {type: types.string})

    // who will manager the request
    .handler(function (req, res, next) {
        // check credentials...

        // return
        next({
            // http code
            code: 200,
            // response, will be json in the body
            response: {success: true, sessionid: "fmsdkljfs98chsduc8w2bc"}
        });
    });

// one you are logged, retrieve user information
// now we introduce a new concept: Hooks
api.define_hook("auth", check_session, null, {description: "required valid session"});

function check_session(req, res, next) {
    if (!req.query.sessionid || req.query.sessionid != "fmsdkljfs98chsduc8w2bc") {
        // return an error, no other Hook will be executed
        return next({
            code: 401,
            response: {success: false, error: "session not found"}
        });
    }
    // it"s ok!
    next(true); // this means continue with the next Hook
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



```