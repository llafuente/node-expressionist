# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)


Notice: This is still a work in process, it's rather stable.

## Introduction

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs


## How?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)

```yml

# Root ID, must be unique, only the last one prevail
get-date-diff:
    # Type of object, you can define more than just URIs...
    type: uri
    # suported methods GET|POST|PUT|DELETE|PATCH|HEAD
    methods: [GET]
    uri: /date-diff
    doc: |+
      Get the date difference between given and the server.

    handler: date.js:diff # explained below
    # input validation
    get:
        date:
            cast: date
            doc: current client date
            constraints:
                date:
    #post
    response
      diff:
        cast: integer
        doc: Difference in milliseconds
    data:
      #here put your application data, ex: access control using user-permissions
```

After that create expressionist and load the YML.

```js

    var Expressionist = require("apis-expressionist"),
        expressionist,
        express = require("express"),
        app = express();


    app.use(express.cookieParser('no-more-secrets'));
    app.use(express.bodyParser());

    expressionist = new Expresionist();
    expressionist.rootDir = __dirname;
    expressionist.attach(app);

    // loading YML file
        expressionist.loadYML("uris.yml", function () {
    });

    // I found interesting to concatenate various files, and group it
    // groups can be used to export documentation in order or to a different files
    expressionist.loadYML(["common-hooks.yml", "users.yml"], "users", function () {
    });

```

## URI definitions (type: uri)
Contains the following parameters

* **methods** (required) GET|POST|PUT|DELETE|PATCH|HEAD
* **uri** (required)

  If the URL starts with "/", there will be no version-ing (recommended)
  Otherwise expressionist.version (regexp) will be used to define the final URI.
* **doc** (optional)

  Documentation text. It's recommended to use "|+" instead of ">" for multi-line text.

* **requestHooks** (optional)

  Callbacks that are executed before the handler.
  Those hooks, must be defined before or will throw.

  [More info](#requestHooks)


* **requestHooks** (optional)

  Callbacks that are executed after the handler.
  Those hooks, must be defined before or will throw.

  [More info](#responseHooks)

* **handler**

  FQFN of the handler.

* **handlerArguments** (optional) COMPACT|EXPAND Default: COMPACT *

  Define how expressionist send arguments to the handler.
  * **COMPACT**: just three arguments [req, res, next] (same as express)
  * **EXPAND**: all or a white-list of input as parameters
* **handlerArgumentsOrder** (optional) Default: all inputs *

  List of names with the arguments wanted. By default use all inputs with the following preference: params, get, post.
Do not handle name collisions. In case GET/POST input has the same name (not recommended!!) will use the first found using the preference above.
* **params, get, post & files**

  Define input to the API Method, many example below.
  * **cast**, type that will be casted
  * **constraints**, list of constraints that the input has to meet.
  * **object**, special case for cast: object, define the object structure.
  * **each**, special case for cast: array, define each item structure

* **response**

  Define the response. If your method do not meet the requirements expressionist will throw an error.

* **version** (do not use yet)



```
"users.js:get" - require("users.js").get
"users.js:read.one" - require("users.js").read.one

@todo for future improvements
"users.js:!ret_get" - (new require("users.js")).ret_get
```

The habdler is a function and must have three parameters [req, res, next] (same as express)
You can use handlerArguments: EXPAND to add inputs from get/post/param directly as arguments in the function (@todo link to example)


### Handler parameters (req, res, next)

#### Request

* **route** It's all the route JSON, here you can access your "data"

#### Response
First **do not use res.send** unlike you really want it!

This is not the way to work with expressionist (it's the 'express' way). You should use: setResponse
Expressionist is compatible with existing 'express' applications but encourage you to use another aproach.

Additions:

* **setResponse** (response)
* **getResponse** (response)
* **addError** (status, message, code, long_message)
* **hasErrors** ()
* **addWarning** (message, code, long_message)
* **hasWarnings** ()
* **content** = {}
  variable where response, errors & warnings are stored. Use it with caution!


#### next (callback)
it's the callback to continue with the execution. It's a good practice to always use "return next();" do avoid executing twice the callback.


### <a name="requestHooks"></a> Request Hooks.
This are callbacks called before the handler.

The most common example could be session management, authentication, extra validations (like object exists in database).

Request hooks can addError(s) to response object, in that case handler will not be executed.

Also the default behavior is to stop after a Hook add any number of errors, to prevent this use: "requestHooksPolicy: CONTINUE_ON_ERROR", handler will not be executed event with CONTINUE_ON_ERROR.


Example:

```yml

# define auth-hook
auth-hook:
    type: requestHook
    target: auth.js:preHook
    doc: >
        Require Authentication

# use auth-hook
private-zone:
    type: uri
    methods: [GET]
    uri: /private/zone
    doc: >
        This example amuse that you don't send any parameter.
        You will have many errors in the response

    #function handler must exists
    handler: private.js:get_zone

    requestHooksPolicy: CONTINUE_ON_ERROR
    requestHooks:
        - auth-hook

    get: # GET
        do_not_send_me:
            cast: string
            constraints:
                length: [1, 32]

```

Response

```js
{ success: false,
  errors: [
    { code: 1000,
      status: 400,
      message: 'invalid-input',
      long_message: '[do_not_send_me] is undefined' },
    { code: undefined,
      status: 403,
      message: 'invalid-auth',
      long_message: undefined
    }
  ]
}
```

Note: Response HTTP status code will be the one in the first error: 400. Expressionist do not remove status from errors because could be useful in some cases.

#### <a name="responseHooks"></a>Response Hooks.

continue soon :)



## Log
expressionist use noboxout-log.


Mute log
```js
    expressionistInstance.logMute = true;
```

Adjust verbosity
```js
    expressionistInstance.logLevel = 4; // all
    expressionistInstance.logLevel = 3; // no verbose
    expressionistInstance.logLevel = 2; // no verbose, debug
    expressionistInstance.logLevel = 1; // no verbose, debug, warn
    expressionistInstance.logLevel = 0; // no verbose, debug, warn, error
```