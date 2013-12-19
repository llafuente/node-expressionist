var yaml = require('js-yaml'),
    fs = require('fs'),
    path = require('path'),
    verbose = function () {},
    debug = console.log,
    warn = console.log,
    path = require("path"),
    util = require("util"),
    validator = require("validator"),
    validators = {},
    sanitizer_to;

//rename validators for easy to use
// lowercase and starts with is
Object.each(validator.validators, function (v, k) {
    k = k.toLowerCase();
    if (k.indexOf("is") !== 0) {
        k = "is" + k;
    }

    //debug(k);

    validators[k] = v;
});

// islen -> islength
validators.islength = validators.islen;



sanitizer_to = {
    int: function (val) {
        var i = parseInt(val, 10);
        return isNaN(i) ? 0 : i;
    },
    float: function (val) {
        var i = parseFloat(val, 10);
        return isNaN(i) ? 0 : i;
    },
    string: function (val) {
        return String(val);
    },
    date: function (val) {
        if (val instanceof Date) {
            return val;
        }

        var intDate = Date.parse(val);

        if (isNaN(intDate)) {
            return null;
        }
        return new Date(intDate);
    },
    object: function (val) {
        return val || {};
    },
    array: function (val) {
        return val || [];
    }
};

//console.log(validators);
//console.log(sanitizer_to);
//process.exit();

var expresionist = function () {
    this.hooks = Object.clone(this.hooks);
    this.uris = Object.clone(this.uris);
    this.documentation = Object.clone(this.documentation);
};
//
// properties, configurable
//
expresionist.prototype.rootDir = __dirname;
expresionist.prototype.uriPattern = "/api/{version}/{uri}";
//
// properties, do not touch!
//
expresionist.prototype.app = null;
expresionist.prototype.documentation = {
    uris: {},
    params: {}
};
expresionist.prototype.uris = {
    get: {},
    post: {},
    put: {},
    'delete': {}
    //head: {},
    //patch: {},
};
expresionist.prototype.hooks = {
    request: {},
    response: {}
};

//
// methods
//
expresionist.prototype.FQFN = function (str) {
    str = str.split(":");

    verbose("loading FQFN: ", str);
    var module = require(this.rootDir + path.sep + str[0]);

    return module[str[1]];
};


expresionist.prototype.attach = function (express) {
    this.app = express;
};

expresionist.prototype.listen = function (port, host) {
    return this.app.listen(port, host);
};

expresionist.prototype.loadYML = function (yml_file, callback) {
    if (yml_file[0] !== "/") {
        //relative
        yml_file = path.join(this.rootDir, yml_file);
    }
    fs.readFile(yml_file, {encoding: "utf-8"}, function (err, data) {
        if (err) {
            throw err;
        }

        yaml.loadAll(data, function (doc) {
            this.loadJSON(doc);
            if (callback) {
                callback();
            }
        }.bind(this));
    }.bind(this));
};

expresionist.prototype.loadJSON = function (json) {

    debug(json);

    var idx,
        fn,
        d,
        each_uri = function (method) {
            // rename some keys

            this.uri(d.uri, method, d);
        }.bind(this);

    for (idx in json) {
        d = json[idx];
        switch (d.type) {
        case "docParam":
            this.documentation.params[d.name || idx] = d.doc;
            break;
        case "docURI":
            this.documentation.uris[d.method.toLowerCase() + ":" + (d.name || idx)] = d.doc;
            break;
        case "requestHook":
            fn = this.FQFN(d.target);

            this.requestHook(idx, fn, d.docs || {});
            break;
        case "responseHook":
            fn = this.FQFN(d.target);

            this.responseHook(idx, fn, d.docs || {});
            break;
        case "uri":
            d.methods.forEach(each_uri);
            break;
        }
    }
};

expresionist.prototype.requestHook = function (name, callback, doc) {
    if (this.hooks.request[name]) {
        throw new Error("requestHook already defined");
    }

    if ("function" !== typeof callback) {
        throw new Error("requestHook callback must be a function");
    }

    if (callback.length !== 3) {
        throw new Error("requestHook callback must have 3 parameters");
    }

    this.hooks.request[name] = {
        name: name,
        callback: callback,
        doc: doc || {}
    };

    return this;
};

expresionist.prototype.responseHook = function (name, callback, doc) {
    if (this.hooks.response[name]) {
        throw new Error("responseHook already defined");
    }

    if ("function" !== typeof callback) {
        throw new Error("responseHook callback must be a function");
    }

    if (callback.length !== 3) {
        throw new Error("responseHook callback must have 3 parameters");
    }

    this.hooks.response[name] = {
        name: name,
        callback: callback,
        doc: doc || {}
    };

    return this;
};

function uri_parameters(bag, documentation, path) {
    if (!bag) {
        return null;
    }
    path = path || "";

    var idx;

    for (idx in bag) {
        bag[idx].cast = bag[idx].cast || "string";
        bag[idx].doc = bag[idx].doc || documentation.params[idx] || documentation.params[path + idx] || null;

        if (!bag[idx].doc) {
            warn("missing parameter [" + idx + "] documentation");
        }

        if ("object" === bag[idx].cast) {
            bag[idx].object = uri_parameters(bag[idx].object, documentation, path + idx + ".");
        }
    }

    return bag;

//
}

expresionist.prototype.uri = function (uri, method, options) {
    options.version = options.version || "latest";
    // if not global use the pattern!
    if (uri[0] !== "/") {
        uri = this.uriPattern.replace("{version}", options.version).replace("{uri}", uri);
    }
    // TODO normalize url


    method = method.toLowerCase();

    // custom method ?
    if (!this.uris[method]) {
        this.uris[method] = {};
    }

    //defined ?
    if (this.uris[method][uri]) {
        throw new Error(method + ":" + uri + " already defined");
    }

    // search for global docs
    options.doc = options.doc || this.documentation.uris[method + ":" + uri];
    if (!options.doc) {
        warn(method + ":" + uri + " missing method description: " + method + ":" + uri);
    }

    var handler = this.FQFN(options.handler),
        params,
        query,
        body;

    if ("function" !== typeof handler) {
        throw new Error(method + ":" + uri + " handler must be a function");
    }

    if (handler.length !== 3) {
        throw new Error(method + ":" + uri + " handler must have 3 parameters");
    }

    params = uri_parameters(options.params, this.documentation);
    query = uri_parameters(options.get, this.documentation);
    body = uri_parameters(options.post, this.documentation);

    //add
    this.uris[method][uri] = {
        uri: uri,
        version: options.version,
        method: method,

        params: params,
        query: query,
        body: body,

        handler: handler,

        requestHooks: options.requestHooks || null,
        responseHooks: options.responseHooks || null,

        response: options.response || null,

        doc: options.doc
    };

    this.app[method](uri, function (req, res, next) {
        this.call(uri, method, req, next, res);
    }.bind(this));

    return this;
};
/// TODO if the method is GET do not validate POST
expresionist.prototype.validateInput = function (validation, to_check, res) {
    var name,
        value,
        fn_name,
        current_value,
        param_properties,
        constraints,
        args,
        constraint_fn,
        cast_fn,
        ret;

    for (name in validation) {
        param_properties = validation[name];
        constraints = param_properties.constraints || {};

        current_value = to_check[name];
        if (current_value === undefined) {
            if (constraints.optional === undefined) {
                res.addError(400, "invalid-input", "[" + name + "] is undefined");
            }
            continue; //skip it's optional?
        }

        debug("validate ", {name: name, properties: param_properties, value: current_value});

        // validate sub-level ?
        if ("object" === param_properties.cast) {
            this.validateInput(param_properties.object, to_check[name], res);

        } else {
            for (fn_name in constraints) {
                args = constraints[fn_name];

                constraint_fn = validators["is" + fn_name];

/*
console.log(validators);
console.log(fn_name);
console.log(constraint_fn);
process.exit();
*/

                if (!constraint_fn) {
                    res.addError(400, "constraint [" + fn_name + "] not found");
                } else {
                //console.log(fn_name, Array.isArray(args) ? args.length : "direct-call");

                    if (Array.isArray(args)) {
                        switch (args.length) {
                        case 1:
                            ret = constraint_fn(current_value, args[0]);
                            break;
                        case 2:
                            ret = constraint_fn(current_value, args[0], args[1]);
                            break;
                        case 3:
                            ret = constraint_fn(current_value, args[0], args[1], args[2]);
                            break;
                        default:
                            ret = false;
                        }
                    } else {
                        ret = constraint_fn(current_value, args);
                    }

                    if (!ret) {
                        res.addError(400, "constraint [" + fn_name + "] fail for [" + name + "]");
                    }
                }
            }
        }

        cast_fn = sanitizer_to[param_properties.cast];

        if (!cast_fn) {
            res.addError(400, "cast [" + param_properties.cast + "] not found");
        }

        to_check[name] = cast_fn(to_check[name]);
    }

    //console.log(util.inspect(to_check, {depth: 5, colors: true}));
};

function handle_iteration(req, res, express_next, self) {
    verbose("#", this.status, this.itr);

    var hooks,
        current_hook_name,
        fn,
        ret;

    switch (this.status) {
    case "setup":

        res.content = {
            response : null,
            errors: [],
            warnings: []
        };

        res.setResponse = function (response) {
            this.content.response = response;
        };
        res.getResponse = function (response) {
            return this.content.response;
        };
        res.addError = function (code, message, long_message) {
            return this.content.errors.push({
                code: code,
                message: message,
                long_message: long_message
            });
        };
        res.hasError = function () {
            return this.content.errors.length > 0;
        };
        res.addWarning = function (code, message, long_message) {
            return this.content.warnings.push({
                code: code,
                message: message,
                long_message: long_message
            });
        };
        res.hasWarning = function () {
            return this.content.warnings.length > 0;
        };
        this.next = function () {
            ++this.itr;

            self(req, res, express_next, self);
        }.bind(this);

        this.status = "checkRequest";
        this.itr = 0;

        return self(req, res, express_next, self);

    case "checkRequest":
        verbose(this.route);
        verbose(req);
        // params, get, post
        ["params", "query", "body"].forEach(function (target) {
            var to_check = req[target],
                validation = this.route[target];


            if (validation !== null) {
                verbose("validation: ", validation, "\nagainst: ", to_check);
                this.expresionist.validateInput(validation, to_check, res);
            }

        }.bind(this));

        this.status = "requestHooks";
        this.itr = 0;

        return self(req, res, express_next, self);

    case "requestHooks":
        if (!res.hasError()) {
            hooks = this.route.requestHooks;
            if (hooks && hooks.length > this.itr) {
                current_hook_name = hooks[this.itr];
                verbose("exec", current_hook_name);
                fn = this.expresionist.hooks.request[current_hook_name];

                return fn.callback(req, res, this.next);
            }
            this.status = "handler";
            this.itr = 0;

            return self(req, res, express_next, self);
        } // end the current requests we have an error!
        break;
    case "handler":
        if (!res.hasError()) {
            if (this.itr === 0) {
                return this.route.handler(req, res, this.next);
            }

            this.status = "responseHooks";
            this.itr = 0;

            return self(req, res, express_next, self);
        } // end the current requests we have an error!
        break;
    case "responseHooks":
        if (!res.hasError()) {
            hooks = this.route.responseHooks;
            if (hooks && hooks.length > this.itr) {
                current_hook_name = hooks[this.itr];
                verbose("exec", current_hook_name);
                fn = this.expresionist.hooks.response[current_hook_name];

                return fn.callback(req, res, this.next);
            }
            // now the requests end
        } // end the current requests we have an error!
        break;
    }

    //build the response!
    debug("response", res.content);

    if (res.content.errors.length > 0) {
        // error response
        ret = {success: false, errors: res.content.errors};
        if (res.content.warnings.length > 0) {
            ret.warnings = res.content.warnings;
        }
    } else {
        // ok but could contains warnings
        ret = res.content.response || {};
        ret.success = ret.success === true;

        if (res.content.warnings.length > 0) {
            ret.warnings = res.content.warnings;
        }
    }
    debug("result", ret);
    res.send(ret);
    res.end();

    express_next(ret);
}

expresionist.prototype.call = function (uri, method, req, callback, res) {
    var m,
        route,
        routes = this.app.routes[method],
        i,
        iterator;

    res = res || { // response type fake!
        finished: false,
        headers: {},
        setHeader: function (key, value) {
            this.headers[key.toLowerCase()] = value;
        },
        send: function (response) {
        },
        end: function () {
            debug("# direct-call scope, end was called", arguments);
        }
    };

    req.params = req.params || [];
    req.query = req.query || {};
    req.body = req.body || {};

    for (i = 0; i < routes.length && !route; ++i) {
        m = routes[i].match(uri);
        if (m) {
            req.params = routes[i].params;
            route = this.uris[method][routes[i].path];
        }
    }

    if (!route) {
        //console.log(util.inspect(this, {showHidden:false, depth:4, colors:true}));
        throw new Error("route-not-found");
    }

    console.log("#call ", route, req, res);

    iterator = handle_iteration.bind({
        expresionist: this,
        route: route,
        status: "setup",
        itr: 0
    });

    iterator(req, res, function (ret) {
        if (callback) {
            callback(ret);
        }
    }, iterator);

    return this;
};


//shortcuts
["get", "post", "put", "delete"/*, "patch", "head"*/].forEach(function (method) {
    expresionist.prototype[method] = function (uri, options) {
        this.uri(uri, method, options);
    };
});





module.exports = expresionist;