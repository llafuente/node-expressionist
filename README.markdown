# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)
==========

## Introduction
============

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs


### How?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)

Here is an easy example.

```yml

# Root ID, must be unique, only the last one prevail
get-date-diff:
    # Type of object, you can define more than just URIs...
    type: uri
    # suported methods GET|POST|PUT|DELETE, if you extend express you can use more...
    methods: [GET]
    uri: /date-diff
    doc: >
    	Get the date difference between given and the server.
    handler: date.js:diff
    # input validation
    get:
        date:
            cast: date
            doc: current client date
            constraints:
                date:

```

The handler it's a FQFN, FULLY QUALIFIED FUNCTION NAME (c) by me :)

And must have three parameters (same as express) [req, res, next] (more if you use: handlerArguments: EXPAND, explained later)

First contains the file/module => require("file/module"), after ":" it comes the function.


```
"users.js:get"
  require("users.js").get

"users.js:read.one"
  require("users.js").read.one

// note: for future improvements
"users.js:!ret_get"
  (new require("users.js")).ret_get
```


#### Handler parameters


##### Request
Nothing is added atm. But all validation cast are stored directly here.


##### Response
First *do not use res.send* unlike you really want it!
This is not the way to work with expressionist (it's the 'express' way). You should use: setResponse
Expressionist is compatible with existing 'express' applications but encourage you to use another aproach.


*Reponse*

* setResponse(response)
* getResponse(response)
* addError(status, message, code, long_message)
* hasErrors()
* addWarning(message, code, long_message)
* hasWarnings()
* content = {} # variable where response/errors&warnings are stored. Use it with caution!


##### next
It the callback to continue with the execution.


#### Request Hooks.
This are callbacks called before the handler.

The most common example could be session management, authentication, extra validations (like object exists in database).

Request hooks can addError(s) to response object, in that case handler will not be executed.

Also the default behavior is to stop after a Hook add any number of errors, to prevent this use: "requestHooksPolicy: CONTINUE_ON_ERROR", handler will not be executed event with CONTINUE_ON_ERROR.


Example

```yml

# define auth-hook
auth-hook:
    type: requestHook
    target: auth.js:preHook
    doc: >
        Require Authetication

# use auth-hook
private-zone:
    type: uri
    methods: [GET]
    uri: /private/zone
    doc: >
        This example asume that you dont send any parameter.
        You will have many errors in the response

    handler: private.js:remember_this_wil_never_be_executed
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


#### Response Hooks.

continue soon :)