# node-expressionist [![Build Status](https://secure.travis-ci.org/llafuente/node-expressionist.png?branch=master)](http://travis-ci.org/llafuente/node-expressionist)
==========

## Introduction
============

Wrapper on top express to Write, Document and 'Create the client'™ of REST APIs


# How ?

First write an YML with your URLs, Parameters, Validations, Constraints, Hooks, Handlers and Documentation. All in one place :)

Here is an easy example.

```yml

get-date-diff: #this is the ID, must be unique
    type: uri #type of object, you can define more than just URIs...
    methods: [GET] #suported methods GET|POST|PUT|DELETE, if you extend express you can use more...
    uri: /get/date-diff 
    handler: users.js:ret_get
    get: # GET validation
        date:
            cast: date
            constraints:
                date:

```

The handler thing is tricky. It's a string that I called FQFN (FULLY QUALIFIED FUNCTION NAME).
First contains the file/module => require("file/module"), after ":" it comes the function.

so: "users.js:ret_get" will be require("users.js").ret_get, and will be used as handler for the request.

Request Hooks.
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