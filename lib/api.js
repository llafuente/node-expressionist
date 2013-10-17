module.exports = function (exports) {
    "use strict";

    var util = require("util"),
        documentation = require("./doc.js"),
        debug = function () {}, //console.log,
        __verbose = function () {}, //console.log,
        __notice = function () {}, //console.log,
        __types = require("./types.js"),
        api;

    /*
    todo
        http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api#restful

        fields: ["xxx", "yyy"] --> only return those first level fields delete the rest!
        output: json|xml
        pretty_output
        jsonp xxx {status: xxx, response: xxx, url: xxx, params: xxx}
        rate limit
            output new headers
            X-Rate-Limit-Limit - The number of allowed requests in the current period
            X-Rate-Limit-Remaining - The number of remaining requests in the current period
            X-Rate-Limit-Reset - The number of seconds left in the current period

        alias

    */

    function check_response() {
        // throw on error
        return true;
    }

    function uniqid(str, len) {
        var chars = [],
            i;
        for (i = 0; i < len; i++) {
            chars[i] = str[Math.floor((Math.random() * str.length))];
        }
        return chars.join("");
    }

    function param_check(value, options, checks, req, errors) {
        var i;

        if (options instanceof Array) { // value is an object and need to check each property
            options.forEach(function (op) {
                value[op.name] = param_check(value[op.name], op, checks, req, errors);
            });

            return value;
        }

        // optional and not defined?
        if (
            (options.optional === true && value === undefined) ||
            (options.canBeNull === true && value === null)
        ) {
            // has default value ?
            if (value === undefined && req && options.scope && options.default) {
                // set
                value = options.default;
            }

            return value;
        }

        // optional (defined) or required
        if (options.canBeNull === false && (value === null || value === "")) {
            errors.push({
                message: "invalid-" + (options.params === true ? "parameters" : "response"),
                long_message: "parameter[" + options.name + "] is null or empty"
            });

            return null;
        }

        if (!options.type.check(value, options)) {
            errors.push({
                message: "invalid-" + (options.params === true ? "parameters" : "response"),
                long_message: "parameter[" + options.name + "] is [" + value + "] not valid " + options.type.id
            });

            return null;
        }

        // sanitize only params
        if (req && options.scope && options.params === true) {
            value = options.type.sanitize(value);
        }

        if (options.ref) {
            __verbose("#checking", options.ref);
            if (value.forEach) {
                value.forEach(function (v, k) {
                    param_check(v, checks[options.ref], checks, req, errors);
                });
            } else {
                param_check(value, checks[options.ref], checks, req, errors);
            }
        }

        return value;
    }

    function params_check(checks, req, res, current_check) {
        __verbose("#params_check", checks);

        var x,
            op,
            errors = [];

        for (x in checks) {
            if (x[0] !== ":") { // ref types
                op = checks[x];
                // scope is optional, useful for input check
                __verbose("#scope", op.scope, req);
                if (op.scope) {
                    req[op.scope][x] = param_check(req[op.scope][x], op, checks, req, errors);
                } else {
                    req[x] = param_check(req[x], op, checks, req, errors);
                }
            }
        }

        return errors;

    }

    function set_request_id(res, req) {
        var request_id = uniqid("abcdefghijklmnopqrstuvwxyz123456789", 32);
        res.request_id = request_id;
        req.request_id = request_id;
    }


    // the callback parameter is used in api.call
    function handler_itr(req, res) {
        __verbose("handler_itr args", arguments.length);
        __verbose("handler this", this);

        var where = 'hooks-before',
            parameters_errors = params_check(this.pcheck, req, res),
            hook_itr = -1,
            next,
            success,
            error;

        set_request_id(res, req);

        success = function (obj) {
            obj = obj || {};

            obj.success = true;
            next({
                http_code: 200,
                response: obj
            });
        };

        error = function (http_code, error_list) {
            if (error_list instanceof Array) {
                error_list = [error_list];
            }

            next({
                http_code: http_code,
                response: {
                    success: false,
                    errors: error_list
                }
            });
        };


        next = function (response) {
            response = response || true; //true means continue

            //do your magic!!
            var i,
                h,
                hook_cfg,
                is_object = false;

            // expand the response if needed
            if ("object" === typeof response) {
                is_object = true;
                if (!response.http_code) {
                    response = {
                        http_code: 200,
                        response: response
                    };
                }
            }

            ++hook_itr;
            debug(where, hook_itr, this.chooks.length);
            __verbose("#response", response);
            __verbose("#check", response === true, is_object, response.http_code === 200);

            if (response === true || (is_object && response.http_code === 200)) {
                switch (where) {
                case 'hooks-before':
                    if (hook_itr > this.chooks.length) {
                        throw new Error("You can only call one callback in the hook");
                    }

                    if (this.chooks.length === hook_itr) {
                        hook_itr = -1;
                        where = "handler";
                        return next();
                    }

                    hook_cfg = this.self.get_hook(this.chooks[hook_itr]);

                    // hook is not defined, continue with the next one
                    if (hook_cfg.callback_before_handler === null) {
                        return next();
                    }

                    return hook_cfg.callback_before_handler(req, res, next, error);

                case 'handler':
                    if (hook_itr > 1) {
                        throw new Error("You can only call one callback in the handler");
                    }
                    // 0 first
                    if (hook_itr === 0) {
                        return this.handler(req, res, success, error);
                    }
                    // 1 next
                    if (hook_itr === 1) {
                        hook_itr = -1;
                        where = "hooks-response";
                        return next(response);
                    }
                    break;
                case 'hooks-response':
                    if (hook_itr > this.chooks.length) {
                        throw new Error("You can only call one callback in the hook");
                    }

                    if (this.chooks.length === hook_itr) {
                        hook_itr = -1;
                        where = "return-at-last";
                        return next(response);
                    }

                    hook_cfg = this.self.get_hook(this.chooks[hook_itr]);

                    // hook is not defined, continue with the next one
                    if (hook_cfg.callback_before_return === null) {
                        return next(response);
                    }

                    return hook_cfg.callback_before_return(req, res, response, next, error);

                }
            }

            __verbose("# res.finished", res.finished);

            if (res.finished === false) {
                if (!is_object) {
                    if (this.callback) {
                        return this.callback({success: false, error: "invalid-output-type", ex: response}, 500, response.headers);
                    }

                    this.self.ret(res, {success: false, error: "invalid-output-type", ex: response}, 500, {});
                    throw new Error("invalid-output-type");
                }

                if (this.callback) {
                    return this.callback(response.response, response.http_code, response.headers);
                }

                return this.self.ret(res, response.response, response.http_code, this.rcheck);
            }
            // this means, no manage the response! it's closed before!
            __notice("# request manager in the handler, is OK ?");

        }.bind(this); // end of next

        if (parameters_errors.length === 0) {
            next(true);
        } else {
            next({
                http_code: 500,
                response: {success: false, errors: parameters_errors}
            });
        }
    }


    api = function (express_server) {

        var app = express_server,
            methods = {
                get: {},
                post: {},
                delete: {},
                put: {}
            },
            uris = [],
            current,
            warnings = [],
            hooks = {},
            descriptions = {
            },
            types = {
            };



        return {
            types: __types,
            version_pattern: "/v{version}/{uri}",

            define_description: function (literal, description) {
                descriptions[literal] = description;

                return this;
            },

            define_hook: function (hook_name, callback_before_handler, callback_before_return, doc_data) {
                if (hooks[hook_name]) {
                    throw new Error("hook already defined");
                }

                callback_before_handler = callback_before_handler || null;
                callback_before_return = callback_before_return || null;

                if (callback_before_handler !== null && callback_before_handler.length !== 4) {
                    throw new Error("callback_before_handler must have 4 parameters");
                }
                if (callback_before_return !== null && callback_before_return.length !== 5) {
                    throw new Error("callback_before_return must have 5 parameters");
                }

                hooks[hook_name] = {
                    name: hook_name,
                    callback_before_handler: callback_before_handler,
                    callback_before_return: callback_before_return,
                    docs: doc_data || {}
                };

                return this;
            },

            get_type: function (name) {
                if (!types[name]) {
                    throw new Error("type[" + name + "] not found");
                }

                return Object.clone(types[name]);
            },
            define_type: function (name, options) {
                if (types[name]) {
                    throw new Error("type[" + name + "] already defined");
                }

                types[name] = options;

                return this;
            },
            extend_type: function (old_type, new_type, options) {
                if (!types[old_type]) {
                    throw new Error("type[" + old_type + "] not defined and options is null");
                }
                if (types[new_type]) {
                    throw new Error("type[" + new_type + "] already defined");
                }

                var t = Object.clone(types[old_type]),
                    i;

                if (options instanceof Array) {
                    // append
                    for (i = 0; i < options.length; ++i) {
                        t.push(options[i]);
                    }
                } else {
                    //merge
                    t = Object.merge(t, options);
                }

                types[new_type] = t;

                return this;
            },
            call: function (method, uri, req, callback) {
                var m,
                    cfg,
                    routes = app.routes[method],
                    i,
                    res = { // response type fake!
                        finished: false,
                        headers: {},
                        setHeader: function (key, value) {
                            this.headers[key.toLowerCase()] = value;
                        },
                        end: function () {
                            __notice("# direct-call scope, end was called", arguments);
                        }
                    },
                    handler;

                req.query = req.query || {};
                req.params = req.params || {};

                for (i = 0; i < routes.length && !cfg; ++i) {
                    m = routes[i].match(uri);
                    if (m) {
                        req.params = routes[i].params;
                        cfg = methods[method][routes[i].path];
                    }
                }

                handler = handler_itr.bind({
                    self: this,
                    pcheck: methods[cfg.method][cfg.uri].params,
                    rcheck: methods[cfg.method][cfg.uri].response,
                    chooks: methods[cfg.method][cfg.uri].hooks,
                    handler: methods[cfg.method][cfg.uri].handler,
                    callback: function (response, http_code, headers) {
                        __verbose("call", arguments);
                        callback(response, http_code, headers);
                    }
                });

                handler(req, res, null);

                return this;
            },

            add_method: function (version, method, uri, description) {
                if (uri[0] !== "/") {
                    uri = this.version_pattern.replace("{version}", version).replace("{uri}", uri);
                }
                // todo normalize url

                if (methods[method][uri]) {
                    throw new Error(method + "(" + uri + ") already defined");
                }

                if (!description) {
                    warnings.push("missing method description: " + method + ":" + uri);
                }

                if (uris.indexOf(uri) === -1) {
                    uris.push(uri);
                }

                current = methods[method][uri] = {
                    uri: uri,
                    version: version,
                    method: method,
                    description: description || descriptions[uri] || "", //todo doc this
                    params: {},
                    handler: null,
                    hooks: [],
                    response: {
                    }
                };

                this.response("success", {type: this.types.sbool});
                this.response("request_id", {type: this.types.string});

                return this;
            },
            get: function (version, uri, description) {
                return this.add_method(version, "get", uri, description);
            },
            post: function (version, uri, description) {
                return this.add_method(version, "post", uri, description);
            },
            put: function (version, uri, description) {
                return this.add_method(version, "put", uri, description);
            },
            delete: function (version, uri, description) {
                return this.add_method(version, "delete", uri, description);
            },

            params: function (params_list) {
                var i;

                for (i = 0; i < params_list.length; ++i) {
                    this.param(params_list[i].name, params_list[i]);
                }

                return this;
            },
            param: function (name, _options) {
                var i,
                    options;
//console.log("param", arguments);
                if (!_options) {
                    if (!types[name]) {
                        throw new Error("type[" + name + "] not defined and options is null");
                    }

                    options = Object.clone(types[name]);
                } else {
                    options = Object.clone(_options);
                }

                if (name[0] === ":" && options instanceof Array) {
                    for (i = 0; i < options.length; ++i) {
                        if (!options[i] || !options[i].type || !options[i].type.id || !options[i].type.check || !options[i].type.sanitize) {
                            throw new Error("invalid param options @" + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }

                        options[i].optional = options[i].optional || false;
                        options[i].scope = options[i].scope || "query";
                        options[i].canBeNull = options[i].canBeNull || false;
                        options[i]._name = name;
                        options[i].description = options[i].description || descriptions[options[i].name] || "";

                        options[i].response = false;
                        options[i].params = true;

                        if (!options[i].description.length) {
                            warnings.push("missing param description: " + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }
                    }
                } else {
                    if (!options || !options.type || !options.type.id || !options.type.check || !options.type.sanitize) {
                        throw new Error("invalid param options @" + current.method + ":" + current.uri + " " + name);
                    }

                    options.optional = options.optional || false;
                    options.scope = options.scope || "query";
                    options.canBeNull = options.canBeNull || false;
                    options.name = name;
                    options.description = options.description || descriptions[name] || "";

                    options.response = false;
                    options.params = true;

                    if (!options.description.length) {
                        warnings.push("missing param description: " + current.method + ":" + current.uri + " " + name);
                    }
                }

                methods[current.method][current.uri].params[name] = options;

                return this;
            },
            responses: function (responses_list) {
                var i;

                for (i = 0; i < responses_list.length; ++i) {
                    this.response(responses_list[i].name, responses_list[i]);
                }

                return this;
            },
            response: function (name, _options) {
                var i,
                    options;

                if (!_options) {
                    if (!types[name]) {
                        throw new Error("type[" + name + "] not defined and options is null");
                    }

                    options = Object.clone(types[name]);
                } else {
                    options = Object.clone(_options);
                }

                if (name[0] === ":" && options instanceof Array) {
                    for (i = 0; i < options.length; ++i) {
                        if (!options[i] || !options[i].type || !options[i].type.id || !options[i].type.check || !options[i].type.sanitize) {
                            throw new Error("invalid response options @" + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }

                        options[i].optional = options[i].optional || false;
                        options[i].canBeNull = options[i].canBeNull || false;
                        options[i]._name = name;
                        options[i].description = options[i].description || descriptions[options[i].name] || "";

                        options[i].response = true;
                        options[i].params = false;

                        if (!options[i].description.length) {
                            warnings.push("missing response description: " + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }
                    }
                } else {
                    if (!options || !options.type || !options.type.id || !options.type.check || !options.type.sanitize) {
                        throw new Error("invalid response options @" + current.method + ":" + current.uri + " " + name);
                    }
                    options.optional = options.optional || false;
                    options.canBeNull = options.canBeNull || false;
                    options.name = name;

                    options.description = options.description || descriptions[name] || "";

                    options.response = true;
                    options.params = false;

                    if (!options.description.length) {
                        warnings.push("missing response description: " + current.method + ":" + current.uri + " " + name);
                    }
                }

                methods[current.method][current.uri].response[name] = options;

                return this;
            },

            hook: function (hook_name) {
                if (!hooks[hook_name]) {
                    throw new Error("hook[" + hook_name + "] not defined");
                }

                methods[current.method][current.uri].hooks.push(hook_name);

                return this;
            },

            /**
             * callback
             *  parameter 1: request
             *  parameter 1: response
             * return
             *  an object that will be stringify to json
             *  false to do nothing
            */
            handler: function (callback) {
                methods[current.method][current.uri].handler = callback;

                var handler = handler_itr.bind({
                        self: this,
                        pcheck: methods[current.method][current.uri].params,
                        rcheck: methods[current.method][current.uri].response,
                        chooks: methods[current.method][current.uri].hooks,
                        handler: callback,
                        callback: null
                    });

                app[current.method](current.uri, handler);

                return this;
            },

            ret: function (res, json, status, structure) {
                __verbose("# ret", util.inspect(json, {depth: 1}), status);

                json.request_id = res.request_id;

                res.setHeader("Content-Type", "application/json");
                res.statusCode = status || 200;

                if (status === 200) {
                    var errors = params_check(structure, json);
                    if (errors.length > 0) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({success: false, errors: errors}), 'ascii');
                    }
                }

                res.end(JSON.stringify(json), 'ascii');
            },
            get_methods: function () {
                return methods;
            },
            get_warnings: function () {
                return warnings;
            },
            get_uris: function () {
                return uris;
            },
            get_hook: function (hook) {
                return hooks[hook];
            },
            doc: function (uri, filter, params_fn, param_fn) {
                var output =
                    "<a name=\"" + uri + "\"></a>\n" +
                    "<h1 class=\"uri\">" + uri + "</h1>\n\n";

                ["get", "post", "put", "delete"].forEach(function (method) {
                    if (methods[method][uri]) {
                        if (!filter || filter(uri, method, methods[method][uri])) {
                            output += documentation.uri(this, uri, method, methods[method][uri], params_fn || documentation.params, param_fn || documentation.param);
                        }
                    }
                }.bind(this));

                return output;
            }
        };
    };


    api.types = __types;

    return {
        api: api,
        request_id: function () {
            return uniqid("abcdefghijklmnopqrstuvwxyz123456789", 32);
        }
    };

}();
