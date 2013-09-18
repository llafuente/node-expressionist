(function (exports) {
    "use strict";

    var util = require("util"),
        documentation = require("./doc.js");

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

        if (options instanceof Array) { // value is an object and need to check each property
            options.forEach(function (op) {
                param_check(value[op.name], op, checks, req, errors);
            });

            return;
        }

        // optional and not defined?
        if (options.optional === true && value === undefined) {
            // has default value ?
            if (req && options.scope && options.default) {
                // set
                req[options.scope][options.name] = options.default;
            }

            return;
        }

        // optional (defined) or required
        if (options.canBeNull === false && (value === null || value === "")) {
            errors.push({
                message: "invalid input",
                long_message: "parameter[" + options.name + "] is null or empty"
            });

            return;
        }

        if (!options.type.check(value, options)) {
            errors.push({
                message: "invalid input",
                long_message: "parameter[" + options.name + "] is [" + value + "] not valid " + options.type.id
            });

            return;
        }

        // sanitize only input
        if (req && options.scope) {
            req[options.scope][options.name] = options.type.sanitize(value);
        }

        if (options.ref) {
            // console.log("#checking", options.ref);
            if (value.forEach) {
                value.forEach(function (v, k) {
                    param_check(v, checks[options.ref], checks, req, errors);
                });
            } else {
                param_check(value, checks[options.ref], checks, req, errors);
            }
        }
    }

    function params_check(checks, req, res, current_check) {
        // console.log("#params_check", checks);

        var x,
            op,
            val,
            errors = [];

        for (x in checks) {
            if (x[0] !== ":") { // ref types
                op = checks[x];
                // scope is optional, useful for input check
                // console.log("#scope", op.scope, req);
                val = op.scope ? req[op.scope][x] : req[x];

                // console.log("#checking", x, op, val);
                param_check(val, op, checks, req, errors);
            }
        }

        return errors;

    }

    exports.api = function (express_server) {

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
            };



        return {
            types: exports.api.types,
            version_pattern: "/v{version}/{uri}",

            define_description: function (literal, description) {
                descriptions[literal] = description;
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

            define_type: function () {
            },
            call: function (uri, req, callback) {
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
                this.response("requestid", {type: this.types.string});

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
            param: function (name, options) {
                var i;

                if (name[0] === ":" && options instanceof Array) {
                    for (i = 0; i < options.length; ++i) {
                        if (!options[i] || !options[i].type || !options[i].type.id || !options[i].type.check || !options[i].type.sanitize) {
                            throw new Error("invalid param options @" + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }

                        options[i].optional = options[i].optional || false;
                        options[i].scope = options[i].scope || false;
                        options[i].canBeNull = options[i].canBeNull || false;
                        options[i]._name = name;
                        options[i].description = options[i].description || descriptions[options[i].name] || "";

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

                    if (!options.description.length) {
                        warnings.push("missing param description: " + current.method + ":" + current.uri + " " + name);
                    }
                }

                methods[current.method][current.uri].params[name] = options;

                return this;
            },

            response: function (name, options) {
                var i;

                if (name[0] === ":" && options instanceof Array) {
                    for (i = 0; i < options.length; ++i) {
                        if (!options[i] || !options[i].type || !options[i].type.id || !options[i].type.check || !options[i].type.sanitize) {
                            throw new Error("invalid response options @" + current.method + ":" + current.uri + " " + name + ":" + options[i].name);
                        }

                        options[i].optional = options[i].optional || false;
                        options[i].canBeNull = options[i].canBeNull || false;
                        options[i]._name = name;
                        options[i].description = options[i].description || descriptions[options[i].name] || "";

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
                var mapi = this;


                methods[current.method][current.uri].handler = (function (self) {
                    var pcheck = methods[current.method][current.uri].params,
                        rcheck = methods[current.method][current.uri].response,
                        chooks = methods[current.method][current.uri].hooks;

                    return function (req, res) {
                        var where = 'hooks-before',
                            parameters_errors = params_check(pcheck, req, res),
                            requestid = uniqid("abcdefghijklmnopqrstuvwxyz123456789", 32),
                            hook_itr = -1,
                            next,
                            success,
                            error;

                        res.requestid = requestid;
                        req.requestid = requestid;

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
                                hook_ret,
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
                            //console.log(where, hook_itr, chooks.length);
                            //console.log("#response", response);
                            //console.log("#check", response === true, is_object, response.http_code === 200);

                            if (response === true || (is_object && response.http_code === 200)) {
                                switch (where) {
                                case 'hooks-before':
                                    if (hook_itr > chooks.length) {
                                        throw new Error("You can only call one callback in the hook");
                                    }

                                    if (chooks.length === hook_itr) {
                                        hook_itr = -1;
                                        where = "handler";
                                        return next();
                                    }

                                    // hook is not defined, continue with the next one
                                    if (hooks[chooks[hook_itr]].callback_before_handler === null) {
                                        return next();
                                    }

                                    return hooks[chooks[hook_itr]].callback_before_handler(req, res, next, error);

                                case 'handler':
                                    if (hook_itr > 1) {
                                        throw new Error("You can only call one callback in the handler");
                                    }
                                    // 0 first
                                    if (hook_itr === 0) {
                                        return callback(req, res, success, error);
                                    }
                                    // 1 next
                                    if (hook_itr === 1) {
                                        hook_itr = -1;
                                        where = "hooks-response";
                                        return next(response);
                                    }
                                    break;
                                case 'hooks-response':
                                    if (hook_itr > chooks.length) {
                                        throw new Error("You can only call one callback in the hook");
                                    }

                                    if (chooks.length === hook_itr) {
                                        hook_itr = -1;
                                        where = "return-at-last";
                                        return next(response);
                                    }

                                    // hook is not defined, continue with the next one
                                    if (hooks[chooks[hook_itr]].callback_before_return === null) {
                                        return next(response);
                                    }

                                    return hooks[chooks[hook_itr]].callback_before_return(req, res, response, next, error);

                                }
                            }

                            if (res.finished === false) {
                                if (!is_object) {
                                    self.ret(res, {success: false, error: "invalid-output-type", ex: response}, 500, {});
                                    throw new Error("invalid output");
                                }

                                return self.ret(res, response.response, response.http_code, rcheck);
                            }
                            // this means, no manage the response! it's closed before!
                            console.log("request manager in the handler, is OK ?");

                        }; // end of next

                        if (parameters_errors.length === 0) {
                            next(true);
                        } else {
                            next({
                                http_code: 500,
                                response: {success: false, errors: parameters_errors}
                            });
                        }
                    };
                }(this));

                app[current.method](current.uri, current.handler);
            },

            ret: function (res, json, status, structure) {
                // console.log("ret", arguments);
                // console.log("#res!", util.inspect(res, {depth: 0}));

                json.requestid = res.requestid;

                res.setHeader("Content-Type", "application/json");
                res.statusCode = status || 200;

                // console.log("#response check");

                if (status === 200) {
                    var errors = params_check(structure, json);
                    if (errors.length > 0) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({success: false, errors: errors}), 'ascii');
                    }
                }


                res.end(JSON.stringify(json), 'ascii');
            },

            methods: function () {
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


    exports.api.types = require("./types.js");

}(module.exports));
