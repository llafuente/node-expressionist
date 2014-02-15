# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)


Notice: This is still a work in process, it's rather stable.

## Introduction

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs


## Expres changes

### req.params
Express params are an array that also contains the keys, like it was an object.
Obviously it shouldn't be an array, expressionist change it to an object 100% compatible.


## Why exception?

Expressionist will throw only when find an invalid input that the developer write.
Any other error (user input) will add errors to response.

## How to write an API ?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)
You could even use JSON, YML is translated to JSON

```yml

# note: the identifier must be unique, YML overwrite keys so the last one prevail.
# note: it's used to create the client
get-date-diff:
    # Type of object, you can define more than just URIs...
    type: uri
    
    # array of methods: GET,POST,PUT,DELETE,PATCH,HEAD
    methods: [GET]
    
    # entry point
    uri: /date-diff
    
    # documentation, it's recommended to use |+ or >
    doc: |+
      Get the date difference between given and the server.

    # main function that will manage the request
    handler: date.js:diff

    # input validation via GET
    get:
        date:
            cast: date
            doc: current client date
            constraints:
                date:
    # input validation via POST (body)
    post:

    # response validation (success === true)
    response:
        diff:
            cast: integer
            doc: Difference in milliseconds

    # custom data, can be retrieve via req.route.data
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
    // groups can be used to export documentation
    expressionist.loadYML(["common-hooks.yml", "users.yml"], "users", function () {
      // note: YML exception will not match line in file
    });

```

## URI definitions (type: uri)
Contains the following parameters

* **methods** (array, required) GET,POST,PUT,DELETE,PATCH,HEAD
* **uri** (string, required)

  If the URL starts with "/", there will be no version-ing (recommended)
  Otherwise expressionist.version (regexp) will be used to define the final URI.

* **doc** (string, optional)

  Documentation text. It's recommended to use "|+" instead of ">" for multi-line text.

* **requestHooks** (array, optional) [More info](#requestHooks)

  Callbacks that are executed before the handler.
  Note: Must be defined before or will throw.

* **requestHooksPolicy** (string[null, CONTINUE_ON_ERROR])

  When any requestHook add an error, the execution stop and return the error to the user.

  In some cases you will want to continue even if errors are found like start-transaction / end-transaction 

  CONTINUE_ON_ERROR will execute all requestHook(**DONE**) and responseHooks(**TODO**) but not the handler.

* **requestHooks** (array, optional) [More info](#responseHooks)

  Callbacks that are executed after the handler.
  Note: Must be defined before or will throw.

* **handler**

  (FQFN)[#FQFN] of the handler.

* **handlerArguments** (string[COMPACT,EXPAND], optional) Default: COMPACT

  Define how expressionist send arguments to the handler.
  * **COMPACT**: just three arguments, same as express (req, res, next)
  * **EXPAND**: will send input as arguments plus req, res & next.

* **handlerArgumentsOrder** (array, optional) Default: null (will send inputs)

  List of names with the arguments wanted. By default use all inputs with the following preference: params, get, post.

  Do not handle name collisions. In case GET/POST input has the same name (not recommended!!) will use the first found using the preference above.

* **params, get, post & files**

  Input schema. See (utilitario)[https://github.com/llafuente/utilitario] module for more information.
  * **cast**
  * **constraints**, list of constraints that the input has to meet.
  * **object**, require "cast: object", define the schema of each key
  * **items**, require "cast: array", define each item schema

* **response**

  Define response schema.
  It's applied only if the response send success: true
  
  If the response is invalid a error response will be sent instead.

* **version** (do not use yet)


## <a name="FQFN"></a> FQFN

Fully Qualified Function Name.
It's just a way to translate a string into function but requiring a module.

```js
"users.js:get" // require("users.js").get
"users.js:read.one" // require("users.js").read.one

// todo for future improvements
"users.js:!ret_get" // (new require("users.js")).ret_get
```

Note: Parameters count is check and throw an exception.
The handler is a function and must have three parameters (req, res, next)
You can use handlerArguments: EXPAND to add inputs from get/post/param directly as arguments in the function (@todo link to example)


### Handler default parameters (req, res, next)

#### Request

The same request as express adding:

* **route** It's all the route JSON, here you can access your "data"

Note: req.params is changed to an object.

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
it's the callback to continue with the execution. It's a good practice to always use "return next();", avoid executing twice the callback.


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