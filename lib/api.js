(function (exports) {
    "use strict";

    var util = require("util");

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

    function param_check(value, options, checks, req) {
        var err,
            errors = [];

        if (options instanceof Array) { // value is an object and need to check each property
            options.forEach(function (op) {
                err = param_check(value[op.name], op, checks, req);
                if (err) {
                    errors.push(err);
                }
            });

            return errors;
        }

        // optional and not defined
        if (options.optional === true && value === undefined) {
            // has default value ?
            if (req && options.scope && options.default) {
                req[options.scope][options.name] = options.default;
            }

            return false;
        }

        // optional (defined) or required
        if (options.canBeNull === false && (value === null || value === "")) {
            return {
                message: "invalid input",
                long_message: "parameter[" + options.name + "] is null or empty"
            };
        }

        if (!options.type.check(value, options)) {
            return {
                message: "invalid input",
                long_message: "parameter[" + options.name + "] is [" + value + "] not valid " + options.type.id
            };
        }

        // sanitize only input
        if (req && options.scope) {
            req[options.scope][options.name] = options.type.sanitize(value);
        }

        if (options.ref) {
            // console.log("#checking", options.ref);
            if (value.forEach) {
                value.forEach(function (v, k) {
                    err = param_check(v, checks[options.ref], checks, req);
                });
            } else {
                err = param_check(value, checks[options.ref], checks, req);
            }
        }

        return false;
    }

    function params_check(checks, req, res, current_check) {
        // console.log("#params_check", checks);

        var x,
            op,
            val,
            err,
            errors = [];

        for (x in checks) {
            if (x[0] !== ":") { // ref types
                op = checks[x];
                // scope is optional, useful for input check
                // console.log("#scope", op.scope, req);
                val = op.scope ? req[op.scope][x] : req[x];

                // console.log("#checking", x, op, val);
                err = param_check(val, op, checks, req);
                if (err) {
                    errors.push(err);
                }
            }
        }

        return errors.length ? errors : false;

    }

    function doc_param(option) {
        //console.log("#doc_param", option);

        var output = "",
            scope,
            optional,
            description,
            i,
            type;

        if (option instanceof Array) {
            output += "<tr>\n";
            output += "<td colspan=\"5\" class=\"reference-type\">\n";
            output += "<table>\n";
            for (i = 0; i < option.length; ++i) {
                output += doc_param(option[i]);
            }
            output += "</table>\n";
            output += "</td>\n";
            output += "</tr>\n";
            return output;
        }


        scope = option.scope ? option.scope + ":" : "";
        optional = (option.optional ? "optional" : "required");
        description = option.description || "";
        type = option.type.id === "in" ? option.values.join("<br />") : option.type.id;

        //output += "  <li>" + scope + option.name + " (" + type + ") " + optional + desc + "</li>\n";
        output +=
            "  <tr>" +
              "<td class=\"scope\"><span>" + scope + "</span></td>" +
              "<td class=\"name\"><span>" + option.name + "</span></td>" +
              "<td class=\"type\"><span>" + type + "</span></td>" +
              "<td class=\"optional\"><span>" + optional + "</span></td>" +
              "<td class=\"description\"><span>" + description + "</span></td>" +
            "</tr>\n";

        return output;
    }

    function doc_params(options) {
        var output = "",
            i,
            p;

        //output += "<ul>\n";
        output += "<table>\n";

        for (p in options) {

            if (p[0] !== ":") {
                if (options[p] instanceof Array) {

                    output += "<tr>\n";
                    output += "<td colspan=\"5\" class=\"reference-type\">\n";
                    output += "<table>\n";

                    for (i = 0; i < options[p].length; ++i) {
                        output += doc_param(options[p][i]);
                        if (options[p][i].ref) {
                            output += doc_param(options[options[p][i].ref]);
                        }
                    }

                    output += "</table>\n";
                    output += "</td>\n";
                    output += "</tr>\n";
                    output += "</table>\n";

                    return output;
                }
                output += doc_param(options[p]);
                if (options[p].ref) {
                    output += doc_param(options[options[p].ref]);
                }
            }
        }

        //output += "</ul>\n";
        output += "</table>\n";

        return output;
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

            define_description: function(literal, description) {
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

            define_type: function() {
            },
            call: function(uri, req, callback) {
            },

            add_method: function (version, method, uri, description) {
                uri = this.version_pattern.replace("{version}", version).replace("{uri}", uri);
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

                        success = function(obj) {
                            obj = obj || {};

                            obj.success = true;
                            next({
                                http_code: 200,
                                response: obj
                            });
                        };

                        error = function(http_code, error_list) {
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
                                switch(where) {
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

                                    break;
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

                                    break;

                                }
                            }

                            if(res.finished === false) {
                                if(!is_object) {
                                    self.ret(res, {success: false, error: "invalid-output-type", ex: response}, 500, {});
                                    throw new Error("invalid output");
                                }

                                return self.ret(res, response.response, response.http_code, rcheck);
                            }
                            // this means, no manage the response! it's closed before!
                            console.log("request manager in the handler, is OK ?");

                        }; // end of next

                        if(parameters_errors === false) {
                            next(true);
                        } else {
                            next({
                                http_code: 400,
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
                    if (errors !== false) {
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
            doc: function (uri) {
                //console.log("#doc ", uri);
                var output = "<h1 class=\"uri\">" + uri + "</h1>\n\n",
                    p,
                    description,
                    scope_order = ["params", "query"],
                    i,
                    hook;

                ["get", "post", "put", "delete"].forEach(function (v) {
                    //console.log("#doc ", uri, v);
                    if (methods[v][uri]) {
                        //console.log(methods[v][uri]);
                        output += "<div class=\"method-container\">\n";
                        output += "<h2 class=\"method\">" + v.toLocaleUpperCase() + "</h2>\n";

                        description = methods[v][uri].description ? methods[v][uri].description : "todo";
                        output += "<p>" + description + "</p>\n";

                        // sort

                        if(methods[v][uri].hooks.length) {
                            output += "<div class=\"hooks-container\">\n";
                            for (i = 0; i < methods[v][uri].hooks.length; ++i) {
                                hook = hooks[methods[v][uri].hooks[i]];
                                output += "<p>\n";
                                output += hook.docs.description;
                                output += "</p>\n";
                            }
                            output += "</div>\n";
                        }

                        output += "<div class=\"input-container\">\n";
                        output += "<h3 class=\"input-header\">Parameters</h3>\n";
                        output += "<div class=\"input-content\">\n";
                        output += doc_params(methods[v][uri].params);
                        output += "</div>\n";
                        output += "</div>\n";

                        output += "<div class=\"response-container\">\n";
                        output += "<h3 class=\"response-header\">Response</h3>\n";
                        output += "<div class=\"response-content\">\n";
                        output += doc_params(methods[v][uri].response);
                        output += "</div>\n";
                        output += "</div>\n";
                        output += "</div>\n";
                    }
                });

                return output;
            }
        };
    };


    exports.api.types = require("./types.js");

}(module.exports));
