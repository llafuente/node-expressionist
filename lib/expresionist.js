(function () {
    'use strict';

    // NODE_ENV=production node your-app.js

    var yaml = require('js-yaml'),
        log = require("noboxout-log"),
        object = require("object-enhancements"),
        Fun = require("function-enhancements"),
        array = require("array-enhancements"),
        fs = require('fs'),
        path = require('path'),
        util = require("util"),
        inspect = require("util").inspect,
        utilitario = require("utilitario"),
        __constraints = utilitario.constraints,
        __cast = utilitario.cast,
        enviroment = process.env.NODE_ENV || "development";

    var expresionist = function () {
        this.hooks = object.clone(this.hooks);
        this.uris = object.clone(this.uris);
        this.documentation = object.clone(this.documentation);
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
        'delete': {},
        head: {},
        patch: {}
    };
    expresionist.prototype.hooks = {
        request: {},
        response: {},
        gRequest: [],
        gResponse: []
    };

    //
    // methods
    //
    expresionist.prototype.FQFN = function (str) {
        str = str.split(":");
        if (str.length !== 2) {
            throw new Error("bad-formatted-fqfn");
        }

        this.verbose("loading FQFN: ", str);
        var module = require(this.rootDir + path.sep + str[0]);

        if (str[1].indexOf(".") === -1) {
            return module[str[1]];
        }

        var props = str[1].split("."),
            i,
            max;
        for (i = 0, max = props.length; i < max; ++i) {
            if (!module[props[i]]) {
                throw new Error("invalid FQFN [" + str + "]");
            }

            module = module[props[i]];
        }

        return module;
    };


    expresionist.prototype.attach = function (express) {
        this.app = express;
    };

    expresionist.prototype.listen = function (port, host) {
        return this.app.listen(port, host);
    };

    expresionist.prototype.parseYML = function (data, group, callback) {
        yaml.loadAll(data, function (doc) {
            this.loadJSON(doc, group);
            if (callback) {
                callback();
            }
        }.bind(this));
    };

    expresionist.prototype.loadYML = function (yml_files, group, callback) {
        if (callback === undefined) {
            callback = group;
            group = undefined;
        }

        if ("development" === enviroment) {
            this.info("load YML(s) ", yml_files, group);
        }

        if ("string" === typeof yml_files) {
            yml_files = [yml_files];
        }

        var data = '',
            yml_file_id = 0,
            load_next = function () {
                if (yml_files.length === yml_file_id) {
                    this.parseYML(data, group, callback);
                } else {
                    var yml_file = yml_files[yml_file_id++];

                    if (yml_file[0] !== "/") {
                        //relative
                        yml_file = path.join(this.rootDir, yml_file);
                    }

                    if ("development" === enviroment) {
                        this.info("reading YML: ", yml_file);
                    }

                    fs.readFile(yml_file, {encoding: "utf-8"}, function (err, partial_data) {
                        if (err) {
                            throw err;
                        }
                        data += partial_data + "\n\n";


                        load_next();
                    }.bind(this));
                }
            }.bind(this);
        load_next();
    };

    expresionist.prototype.loadJSON = function (json, group) {
        var idx,
            fn,
            options,
            each_uri = function (method) {
                // rename some keys

                var opt = object.clone(options);
                opt.clientFunction = idx;

                this.defineURL(opt.uri, method, opt);
            }.bind(this);

        for (idx in json) {
            options = json[idx];
            switch (options.type) {
            case "docParam":
                if (!options.doc) {
                    throw new Error("invalid docParam [" + idx + "] doc not found");
                }

                this.documentation.params[options.name || idx] = options.doc;
                break;
            case "docURI":
                if (!options.doc) {
                    throw new Error("invalid docURI [" + idx + "] doc not found");
                }

                this.documentation.uris[options.method.toLowerCase() + ":" + (options.name || idx)] = options.doc;
                break;
            case "requestHook":
                fn = this.FQFN(options.target);

                this.requestHook(idx, fn, options.doc || "");
                break;
            case "globalRequestHook":
                fn = this.FQFN(options.target);

                this.requestHook(idx, fn, options.doc || "");
                this.hooks.gRequest.push(idx);
                break;
            case "responseHook":
                fn = this.FQFN(options.target);

                this.responseHook(idx, fn, options.doc || "");
                break;
            case "globalResponseHook":
                fn = this.FQFN(options.target);

                this.responseHook(idx, fn, options.doc || "");
                this.hooks.gResponse.push(idx);
                break;
            case "uri":
                options.group = options.group || group;
                options.methods.forEach(each_uri);
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

    expresionist.prototype._uri_parameter = function (structure, path) {
        var doc,
            constraints,
            ck,
            __path = path.join(".");

        structure.cast = structure.cast || "string";
        structure.constraints = structure.constraints || {};
        doc = structure.doc || this.documentation.params[path[path.length - 1]] || this.documentation.params[__path] || null;

        if (!doc) {
            this.warn("missing parameter [" + __path + "] documentation");
        } else {
            structure.doc = doc.replace(/[\s]+$/g, '');
        }


        if ("object" === structure.cast && structure.object) {
            structure.object = this._uri_parameters(structure.object, path);
        }

        if ("array" === structure.cast && structure.items) {
            structure.items = this._uri_parameter(structure.items, path);
        }

        constraints = structure.constraints;

        for(ck in constraints) {
            if (ck !== "optional" && ck !== "nullable") {
                constraints[ck] = constraints[ck] || [];

                if (!constraints[ck].length || "string" !== typeof (constraints[ck][constraints[ck].length -1])) {
                    this.warn("missing constraint text [" + __path + "/" + ck + "] documentation");
                    constraints[ck].push("constraint [" + ck + "] fail");
                }
            }
        }

        return structure;
    }

    expresionist.prototype._uri_parameters = function (bag, path) {
        if (!bag) {
            return null;
        }
        path = path || [];

        var app = this.app,
            idx;

        for (idx in bag) {
            path.push(idx);
            bag[idx] = this._uri_parameter(bag[idx], path);
            path.pop();

        }

        return bag;

    //
    }

    expresionist.prototype.defineURL = function (uri, method, options) {
        if ("development" === enviroment) {
            this.info("define uri", method, ":", uri);
        }

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
            this.warn(method + ":" + uri + " missing method description: " + method + ":" + uri);
        }

        var handler = this.FQFN(options.handler),
            params,
            query,
            body,
            response,
            i,
            max;

        if ("function" !== typeof handler) {
            throw new Error(method + ":" + uri + " handler must be a function");
        }

        options.handlerArguments = options.handlerArguments || "COMPACT";
        if ("COMPACT" === options.handlerArguments) {
            if (handler.length !== 3) {
                throw new Error(method + ":" + uri + " handler must have 3 parameters");
            }
        } else {
            options.handlerArguments = "EXTEND";
            if (!options.handlerArgumentsOrder) {
                options.handlerArgumentsOrder = [];
                // loop from get
                ["params", "get", "post"].forEach(function (k) {
                    if (options[k]) {
                        options.handlerArgumentsOrder = array.add(options.handlerArgumentsOrder, Object.keys(options[k]));
                    }
                });
            }
            max = 3 + options.handlerArgumentsOrder.length;
            if (handler.length !== max) {
                throw new Error(method + ":" + uri + " handler must have " + max + " parameters");
            }

        }

        params = this._uri_parameters(options.params);
        query = this._uri_parameters(options.get);
        body = this._uri_parameters(options.post);
        response = this._uri_parameters(options.response || {});

        //check hooks
        options.requestHooks = options.requestHooks || [];
        for (i = 0, max = options.requestHooks.length; i < max; ++i) {

            if (!this.hooks.request[options.requestHooks[i]]) {
                throw new Error("invalid requestHook name [ " + options.requestHooks[i] + "] not found");
            }
        }
        options.responseHooks = options.responseHooks || [];
        for (i = 0, max = options.responseHooks.length; i < max; ++i) {

            if (!this.hooks.response[options.responseHooks[i]]) {
                throw new Error("invalid responseHook name [ " + options.responseHooks[i] + "] not found");
            }
        }

        // client function
        options.clientFunction = options.clientFunction || uri.replace("/", "-");
        if (options.clientFunction.indexOf(options.group) !== 0) {
            this.warn("It's recommended to start clientFunction with group name, found:", options.clientFunction);
        } else {
            options.clientFunction = options.clientFunction.substring(options.group.length + 1);
        }
        options.clientFunction = utilitario.transform.toCamelCase(options.clientFunction);

        //add
        this.uris[method][uri] = {
            uri: uri,
            version: options.version,
            method: method,
            group: options.group,

            params: params,
            query: query,
            body: body,


            requestHooksPolicy: options.requestHooksPolicy || "STOP_ON_ERROR",
            requestHooks: options.requestHooks,

            handler: handler,
            handlerArguments: options.handlerArguments,
            handlerArgumentsOrder: options.handlerArgumentsOrder,

            clientFunction: options.clientFunction || uri.replace("/", "-"),

            response: response,

            responseHooks: options.responseHooks,

            doc: options.doc,

            data: options.data || {}
        };

        this.app[method](uri, function (req, res, next) {
            req.primary = true;
            this.call(uri, method, req, next, res);
        }.bind(this));

        return this;
    };

    expresionist.prototype.validateObject = function (validation, to_check, options, res) {
        var ret,
            errors = [],
            i,
            max;

        options.cast = options.cast || false;
        options.sanitize = options.sanitize || true;
        options.status = options.status || 400;
        options.message = options.message || "invalid-input";

        ret = utilitario.schema(to_check, {cast: "object", object: validation}, errors, options);
        if (errors.length) {
            for (i = 0, max = errors.length; i < max; ++i) {
                res.addError(options.status, options.message, 1000, errors[i]);
            }
        }

        return ret;
    };

    function handle_iteration(req, res, express_next, self) {
        var exp = this.expresionist;

        exp.verbose("# status", this.status, this.itr);

        if (res.hasErrors && res.hasErrors()) {
            exp.verbose("# errors ?", res.content.errors);
        }

        var hooks,
            current_hook_name,
            fn,
            ret,
            search;

        switch (this.status) {
        case "setup":
            req.expresionist = exp;

            exp.debug("#params", inspect(req.params, {depth:1}));
            exp.debug("#query", inspect(req.query, {depth:1}));
            exp.debug("#body", inspect(req.body, {depth:1}));
            exp.debug("#method", inspect(req.method, {depth:1}));

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
            res.addError = function (status, message, code, long_message) {
                return this.content.errors.push({
                    code: code,
                    status: status,
                    message: message,
                    long_message: long_message,
                    trace: new Error().stack
                });
            };
            res.hasErrors = function () {
                return this.content.errors.length > 0;
            };
            res.addWarning = function (message, code, long_message) {
                return this.content.warnings.push({
                    code: code,
                    message: message,
                    long_message: long_message
                });
            };
            res.hasWarnings = function () {
                return this.content.warnings.length > 0;
            };

            req.route = this.route;

            this.next = function () {
                ++this.itr;

                self(req, res, express_next, self);
            }.bind(this);

            exp.verbose(this.route);

            if (["GET", "DELETE"].indexOf(req.method) !== -1) {
                search = ["params", "query"];
            } else {
                search = ["params", "query", "body"];
            }

            search.forEach(function (target) {
                var to_check,
                    validation = this.route[target],
                    i;

                if (target === "params") {
                    // transform to an object, this is not an array!
                    to_check = {};
                    for (i in req[target]) {
                        to_check[i] = req[target][i];
                    }
                    req[target] = to_check;
                }
                to_check = req[target];

                if (validation !== null) {
                    exp.verbose("validate [", target, "]: ", validation, "\nagainst: ", to_check);
                    exp.validateObject(validation, to_check, {cast: true, message: "invalid-input-" + target}, res);
                }

            }.bind(this));


            exp.log("#params", inspect(req.params, {depth:1}));
            exp.log("#query", inspect(req.query, {depth:1}));
            exp.log("#body", inspect(req.body, {depth:1}));
            exp.log("#method", inspect(req.method, {depth:1}));

            this.status = "globalRequestHooks";
            this.itr = 0;

            return self(req, res, express_next, self);

        case "globalRequestHooks":
            if (!res.hasErrors() || this.route.requestHooksPolicy === "CONTINUE_ON_ERROR") {
                hooks = exp.hooks.gRequest;
                if (hooks && hooks.length > this.itr) {
                    current_hook_name = hooks[this.itr];
                    exp.verbose("exec: global request hook", current_hook_name);
                    fn = exp.hooks.request[current_hook_name];

                    return fn.callback(req, res, this.next);
                }
                this.status = "requestHooks";
                this.itr = 0;

                return self(req, res, express_next, self);
            } // end the current requests we have an error!
            break;
        case "requestHooks":
            if (!res.hasErrors() || this.route.requestHooksPolicy === "CONTINUE_ON_ERROR") {
                hooks = this.route.requestHooks;
                if (hooks && hooks.length > this.itr) {
                    current_hook_name = hooks[this.itr];
                    exp.verbose("exec: request hook", current_hook_name);
                    fn = exp.hooks.request[current_hook_name];

                    return fn.callback(req, res, this.next);
                }
                this.status = "handler";
                this.itr = 0;

                return self(req, res, express_next, self);
            } // end the current requests we have an error!
            break;
        case "handler":
            if (!res.hasErrors()) {
                if (this.itr === 0) {
                    if ("COMPACT" === this.route.handlerArguments) {
                        return this.route.handler(req, res, this.next);
                    }

                    var searchin = ["params","query", "body"];
                    var search = this.route.handlerArgumentsOrder,
                        i,
                        imax = search.length,
                        j,
                        jmax = searchin.length,
                        parameters = [],
                        k,
                        v;

                    for (i = 0; i < imax; ++i) {
                        k = search[i];
                        for (j = 0; j < jmax; ++j) {
                            v = req[searchin[j]][k];

                            if (v !== undefined) {
                                parameters.push(v);
                                j = jmax; //break
                            }
                        }
                    }

                    parameters.push(req);
                    parameters.push(res);
                    parameters.push(this.next);

                    return this.route.handler.apply(null, parameters);
                }

                this.status = "globalResponseHooks";
                this.itr = 0;

                return self(req, res, express_next, self);
            } // end the current requests we have an error!
            break;
        case "globalResponseHooks":
            if (!res.hasErrors()) {
                hooks = exp.hooks.gResponse;
                if (hooks && hooks.length > this.itr) {
                    current_hook_name = hooks[this.itr];
                    exp.verbose("exec: global response hook", current_hook_name);
                    fn = exp.hooks.response[current_hook_name];

                    return fn.callback(req, res, this.next);
                }
                this.status = "responseHooks";
                this.itr = 0;

                return self(req, res, express_next, self);
            } // end the current requests we have an error!
            break;
        case "responseHooks":
            if (!res.hasErrors()) {
                hooks = this.route.responseHooks;
                if (hooks && hooks.length > this.itr) {
                    current_hook_name = hooks[this.itr];
                    exp.verbose("exec: response hook", current_hook_name);
                    fn = exp.hooks.response[current_hook_name];

                    return fn.callback(req, res, this.next);
                }
                // now the requests end
            } // end the current requests we have an error!
            break;
        }

        // validate response!
        if (!res.hasErrors() && res.content.response.success === true) {
            exp.verbose(res.content.response);
            exp.validateObject(this.route.response, res.content.response, {cast: false, status: 500, message: "invalid-output"}, res);
        }

        //build the response!

        if (res.content.errors.length > 0) {
            // error response
            ret = {success: false, errors: res.content.errors};
            if (res.content.warnings.length > 0) {
                ret.warnings = res.content.warnings;
            }
            exp.info("error-response", ret);
        } else {
            // ok but could contains warnings
            ret = res.content.response || {};
            ret.success = ret.success === true;

            if (res.content.warnings.length > 0) {
                ret.warnings = res.content.warnings;
            }
            exp.info("success-response", ret);
        }

        res.send(ret);
        res.end();

        express_next(ret);
    }

    expresionist.prototype.call = function (uri, method, req, callback, res) {
        var m,
            route,
            routes = this.app.routes[method],
            i,
            iterator,
            self = this;

        res = res || { // response type fake!
            finished: false,
            headers: {},
            setHeader: function (key, value) {
                this.headers[key.toLowerCase()] = value;
            },
            send: function (response) {
            },
            end: function () {
                self.warn("# direct-call scope, end was called", arguments);
            }
        };

        req.primary = req.primary === true;
        req.headers = req.headers || {};
        req.params = req.params || [];
        req.query = req.query || {};
        req.body = req.body || {};
        req.cookies = req.cookies || {};
        req.method = method.toUpperCase();

        for (i = 0; i < routes.length && !route; ++i) {
            m = routes[i].match(uri);
            if (m) {
                //req.params = routes[i].params;
                // TODO this params must be filled correctly for testing
                // works on real express environment
                route = this.uris[method][routes[i].path];
            }
        }

        if (!route) {
            this.err(util.inspect(this, {showHidden:false, depth:4, colors:true}));
            throw new Error("route-not-found");
        }

        this.info("#incoming request to", route.uri);
        this.verbose("#route ", inspect(route, {depth:1}));

        this.debug("#headers", inspect(req.headers, {depth:1}));
        this.debug("#cookies", inspect(req.cookies, {depth:1}));

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
    ["get", "post", "put", "delete", "patch", "head"].forEach(function (method) {
        expresionist.prototype[method] = function (uri, options) {
            this.defineURL(uri, method, options);
        };
    });

    // file it's optional, allways return
    expresionist.prototype.exportDoc = function (file, groups) {
        var doc = expresionist.documentator.loopUris(this, this.uris, groups),
            base_dir = path.dirname(this.rootDir + path.sep + file),
            output_file = path.basename(file);

        if (file) {
            fs.writeFile(base_dir + path.sep + output_file, doc, function (err) {
                if (err) {
                    throw err;
                }
                fs.readFile(__dirname + '/documentator.css', function (err, data) {
                    if (err) {
                        throw err;
                    }
                    fs.writeFile(base_dir + path.sep + "documentator.css", data, function () {
                        if (err) {
                            throw err;
                        }
                    });
                });
                fs.readFile(__dirname + '/documentator.html.js', function (err, data) {
                    if (err) {
                        throw err;
                    }
                    fs.writeFile(base_dir + path.sep + "documentator.html.js", data, function () {
                        if (err) {
                            throw err;
                        }
                    });
                });
            });
        }

        return doc;
    };

    expresionist.documentator = require("./documentator.js");

    expresionist.prototype.nodeClient = function (base_url, post_process) {
        var client = {},
            request = require("request"),
            self = this,
            method_match = {
                "delete": "del",
                "get": "get",
                "put": "put",
                "post": "post",
                "head": "head",
                "options": "options"
            };

        object.each(this.uris, function (list, method) {
            object.each(list, function (uri) {
                client[uri.group] = client[uri.group] || {};
                //uri.clientFunction


                client[uri.group][uri.clientFunction] = function () {

                    var url = uri.uri,
                        i,
                        arg_idx = 0,
                        get,
                        post,
                        callback,
                        param,
                        errors = [];

                    // get arguments
                    // params..., get, post
                    for (i in uri.params) {
                        param = arguments[arg_idx++];
                        // check param with utilitario
                        param = utilitario.schema(param, uri.params[i], errors, {cast: false, sanitize: false});
                        if (errors.length) {
                            console.log(arg_idx);
                            throw new Error("invalid parameter type at position " + arg_idx);
                        }

                        url = url.replace(":" + i, param);
                    }

                    get = arguments[arg_idx++] || {};
                    if ("object" !== typeof get) {
                        throw new Error("get parameter in position" + arg_idx + " is not an object");
                    }

                    post = arguments[arg_idx++] || {};
                    if ("object" !== typeof post) {
                        throw new Error("post parameter in position" + arg_idx + " is not an object");
                    }

                    callback = arguments[arg_idx++] || null;
                    if ("function" !== typeof callback) {
                        throw new Error("callback parameter in position" + arg_idx + " is not a function");
                    }

                    self.debug("client-request to", url, get, post);

                    request[method_match[uri.method]](base_url + url, { qs: get, form: post}, function (err, res, body) {
                        if (!err && post_process) {
                            body = post_process(body);
                        }

                        callback && callback(err, body, res);
                    });
                };

            });
        });

        return client;
    };

    object.extend(expresionist.prototype, log);

    expresionist.prototype.logLevel = 4;


    module.exports = expresionist;

}());