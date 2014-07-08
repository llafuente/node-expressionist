# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)

![NPM](https://nodei.co/npm/apis-expressionist.png?compact=true)


## Introduction

Expresionist.wrapper(express).for(['Write', 'Document', 'Generate client']).of('REST APIs')

aka: Wrapper on top of express to Write, Document and 'Create the client'™ of REST APIs


## How to write an API ?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)

You could use JSON too, in fact, YML is translated to JSON.

**uris.yml**
```yml

# The identifier must be unique, YML overwrite keys.
get-date-diff: # this will be the client function name camel-cased.
    # Type of object, you can define more than just URIs...
    type: uri

    # array of methods: GET,POST,PUT,DELETE,PATCH,HEAD
    methods: [GET]

    # entry point
    uri: /date-diff

    # documentation, it's recommended to use |+ or >
    doc: |+
      Get the date difference between given and the server.

    # FQFN: main function that will manage the request
    handler: date.js:diff

    # input validation via GET (query)
    get:
        date:
            cast: date
            doc: current client date
            constraints:
                date:
    # input validation via POST (body)
    post:

    # input validation in the uri params
    params:

    # response validation (if success === true)
    response:
        diff:
            cast: integer
            doc: Difference in milliseconds

    # custom data, can be retrieve via req.route.data in the handler
    data:
        #here put your application data, ex: access control using user-permissions
```

**server.js**
```js

    var Expressionist = require("apis-expressionist"),
        expressionist,
        express = require("express"),
        app = express(),
        cookieParser = require('cookie-parser'),
        bodyParser = require('body-parser'),
        router = express.Router();

    // init express
    app.use(cookieParser('no-more-secrets'));
    app.use(bodyParser.urlencoded({ extended: false }))

    // DO NOT: `app.use(router);` will be called for you


    // init expressionist
    expressionist = new Expresionist(app, router);
    expressionist.rootDir = __dirname;

    // loading YML file
    expressionist.loadYML("uris.yml", function () {
    });

    // I found interesting to concatenate various files, and group it
    // groups can be used to export documentation and sort client code.
    expressionist.loadYML(["common-hooks.yml", "users.yml"], "users", function () {
        // note: YML exception will not match line in file

        expressionist.listen(80);

        //save documentation
        expressionist.saveDoc();
    });


```

## URI definitions (type: uri)
Contains the following parameters

* **methods** (array, required)

  GET, POST, PUT, DELETE, PATCH, HEAD

* **uri** (string, required)

  If the URL starts with "/", there will be no version-ing (recommended)
  Otherwise expressionist.version (regexp) will be used to define the final URI.

* **doc** (string, optional)

  Documentation text. It's recommended to use "|+" instead of ">" for multi-line text.

* **params, get, post & files**

  Input schema. See (utilitario)[https://github.com/llafuente/utilitario] module for more information.
  * **cast**
  * **constraints**, list/object of constraints that the input has to meet.
  * **object**, require "cast: object", define the schema of each key
  * **items**, require "cast: array", define each item schema
  * **sanitize**, not only clean the input also can do some transformation to it, like lowercase
  * **default**, set the default value (that will also be casted!)


* **requestHooks** (array, optional) [More info](#requestHooks)

  Callbacks that are executed before the handler.

  Note: Must be defined before or will throw.

* **requestHooksPolicy** (string[null, CONTINUE_ON_ERROR], optional)

  When any requestHook add an error, the execution stop and return the error to the user.

  In some cases you will want to continue even if errors are found like start-transaction / end-transaction

  CONTINUE_ON_ERROR will execute all requestHook(**DONE**) and responseHooks(**TODO**) but not the handler.

* **handler** (string)

  [FQFN](#FQFN) of the handler.

  Note: Parameters count is checked and throw an exception a difference is found.

  The handler is a function and must have three parameters (req, res, next)

  You can use handlerArguments: EXPAND to add inputs from get/post/param directly as arguments in the function (@todo link to example)

* **handlerArguments** (string[COMPACT,EXPAND], optional) Default: COMPACT

  Define how expressionist send arguments to the handler.
  * **COMPACT**: just three arguments, same as express (req, res, next)
  * **EXPAND**: will send input as arguments plus req, res & next.

* **handlerArgumentsOrder** (array, optional) Default: null (will send inputs)

  List of names with the arguments wanted. By default use all inputs with the following preference: params, get, post.

  Do not handle name collisions. In case GET/POST input has the same name (not recommended!!) will use the first found using the preference above.

* **requestHooks** (array, optional) [More info](#responseHooks)

  Callbacks that are executed after the handler.

  Note: Must be defined before or will throw.


* **response**

  Define response schema.
  It's applied only if the response send success: true

  If the response is invalid a error response will be sent instead.

* **version** (number)
  I plan to include this in the URL but can't find a proper way to do it. Any suggestions/issue!?


## <a name="FQFN"></a> FQFN

**F** ully **Q** ualified **F** unction **N** ame.
It's just a way to translate a string into function but requiring a module, not just by name.

```js
"users.js:get" // tranlated into: require("users.js").get
"users.js:read.one" // tranlated into: require("users.js").read.one

// todo for future improvements
"users.js:!ret_get" // tranlated into:  (new require("users.js")).ret_get
```


### Handler default parameters (req, res, next)

#### Request (req)

Extend [express.request](http://expressjs.com/4x/api.html#req.params)

* `route` It's all the route JSON, here you can access your "data"
* `primary` Boolean (always true atm) is an internal-request ?

#### Response (res)

Extend [express.response](http://expressjs.com/4x/api.html#res.status)

* `setResponse` (Object response)
* `getResponse` () : Object
* `addError` (Number: http_status, String: message, Number: code, String: long_message)
* `hasErrors` () : Boolean
* `addWarning` (String: message, Number: code, String: long_message)
* `hasWarnings` (): Boolean
* `content` = {}

  variable where response, errors & warnings are stored. Use it with caution!

**Do not use res.send** unlike you really want it!

This is not the way to work with `expressionist` (it's the `express` way). You should use: `setResponse`

`expressionist` is compatible with existing `express` applications but encourage you to use another approach.


#### Callback (next)
it's the callback to continue with the execution.
It's a good practice to always use "return next();", avoid executing twice the callback.
Calling twice next could lead to many many problems. We will try to implement something to avoid it in the future.


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

    # function handler must exists
    handler: private.js:get_zone

    # continue to see both errors
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

Same idea as requestHooks, but this time after the handler, so they have the response.
Useful for response encoding, set headers, close connections to database, etc.

## Documentation

`expressionist.saveDoc("doc.html")`

will generate:
* doc.html
* documentator.css
* documentator.html.js

example: [doc.html](http://htmlpreview.github.io/?https://github.com/llafuente/node-expressionist/blob/master/test/doc.html)

## Client generation

usage: expresionist.getNodeClient(String base_url)

example:

```yml
# It's recommended to start IDs with the group sent in loadYML/JSON
# because the client is grouped by 'group'
users-read-one: #users.readOne
    type: uri
    methods: [GET]
    uri: /users/:user_id
    doc: >
        Read user information

    handler: users.js:read

    params:
        user_id:
            cast: integer
```

```js
expressionist.loadYML("users.yml", "users", function () {
});
var client = expresionist.nodeClient("http://www.mydomain.com");

client.users.readOne(1, {/*get*/}, {/*post*/}, function(err, response, body) {
});
```

Notes:

* Function name is camel case of the ID.
* First arguments are params, in the order defined
* Then GET/POST objects
* Then the callback
* everything is required


## Why exceptions?

Expressionist will throw only when find an invalid input that the developer write.
Any other error (user input) will add errors to response.

## Log
expressionist use noboxout-log.


Mute log
```js
    expressionistInstance.logMute = true;
    expressionistInstance.logTraces = 2; // how many stack item should be displayed
```

Adjust verbosity
```js
    expressionistInstance.logLevel = 5; // all
    expressionistInstance.logLevel = 4; // no verbose
    expressionistInstance.logLevel = 3; // no verbose, debug
    expressionistInstance.logLevel = 2; // no verbose, debug, info
    expressionistInstance.logLevel = 1; // no verbose, debug, info, warn
    expressionistInstance.logLevel = 0; // no verbose, debug, info, warn, error
```