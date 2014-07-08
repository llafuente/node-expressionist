var object = require("object-enhancements");

function NodeClient(base_url, post_process, uris) {
    this.base_url = base_url || "";
    this.post_process = post_process || null;
    this.uris = uris;
}

NodeClient.prototype.generate = function () {
    var client = {},
        request = require("request"),
        method_match = {
            "delete": "del",
            "get": "get",
            "put": "put",
            "post": "post",
            "head": "head",
            "options": "options"
        },
        base_url = this.base_url,
        post_process = this.post_process,
        uris = this.uris;

    object.each(uris, function (list, method) {
        object.each(list, function (uri) {
            client[uri.group] = client[uri.group] || {};

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

                console.log("client-request to", url, get, post);

                request[method_match[uri.method]](base_url + url, {
                    qs: get,
                    form: post
                }, function (err, res, body) {
                    if (!err && post_process) {
                        body = post_process(body);
                    }

                    callback && callback(err, res, body);
                });
            };

        });
    });

    return client;
};

module.exports = NodeClient;