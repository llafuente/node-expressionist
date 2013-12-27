# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)
==========

## Introduction
============

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs


### How?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)

Here is an easy example.

```yml

get-date-diff: # This is the ID, must be unique, only the last one prevail
    type: uri # Type of object, you can define more than just URIs...
    methods: [GET] #suported methods GET|POST|PUT|DELETE, if you extend express you can use more...
    uri: /date-diff
    doc: >
    	Get the date difference between given and the server.
    handler: date.js:ret_get
    get: # GET data validation
        date:
            cast: date
            doc: current client date
            constraints:
                date:

```

The handler it's a FQFN, FULLY QUALIFIED FUNCTION NAME (c) by me :)
And must have three parameters (same as express) [req, res, next]
First contains the file/module => require("file/module"), after ":" it comes the function.

```
"users.js:ret_get"
  require("users.js").ret_get

"users.js:read.one"
  require("users.js").read.one

// note for future improvements
"users.js:!ret_get"
  (new require("users.js")).ret_get
```

#### Request additions
Nothing is added atm. But all validation cast are stored directly here.


#### Response additions
First *do not use res.send* unlike you really want it!
This is not the way to work with expressionist (it's the 'express' way). You should use: setResponse
Expressionist is compatible with existing 'express' applications but encourage you to use another aproach.


Reponse
* setResponse(response)
* getResponse(response)
* addError(status, message, code, long_message)
* hasErrors()
* addWarning(message, code, long_message)
* hasWarnings()
* content = {} # variable where response/errors&warnings are stored. Use it with caution!


#### Request Hooks.
This are callback that are called before the handler.
The most common example will be session/auth, extra validations (like object exists in database).

I will cover both with the folowing YML


```yml

update-element:
    type: uri
    methods: [POST]
    uri: /elements/:id
    handler: users.js:ret_get
    post: # GET validation
        name:
            cast: string
            constraints:
                length: [1, 32]
```




continue soon :)