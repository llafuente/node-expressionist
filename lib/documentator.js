var fs = require("fs");

module.exports = {
    doc: [
        '<link rel="stylesheet" href="http://nodejs.org/api/assets/style.css">',
        '<link rel="stylesheet" href="http://nodejs.org/api/assets/sh.css">'
    ],
    URIHeader: function (expresionist, uridata) {
        this.doc.push("<h1>" + uridata.uri + "</h1>");
    },
    URIMethod: function (expresionist, uridata) {
        this.doc.push("<h2>" + uridata.method.toUpperCase() + "</h2>");
    },
    URIDescription: function (expresionist, uridata) {
        if (!uridata.doc) {
            console.warn("(documentator) unexpected empty doc", uridata);
        }
        this.doc.push("<p>" + uridata.doc + "</p>");
    },
    URIHooks: function (expresionist, uridata) {
        var htxt = [];

        ["requestHooks", "responseHooks"].forEach(function (t) {
            uridata[t].forEach(function (k, kk) {
                var hook = expresionist.hooks[t === "requestHooks" ? "request" : "response"][k];
                if (hook.doc) {
                    htxt.push(hook.doc.trim());
                }

            });
        });

        if (htxt.length) {
            this.doc.push("<h3>Notes</h3>");
            this.doc.push("<ul><li>" + htxt.join("</li><li>") + "</li></ul>");
        }
    },
    URIParameter: function (data, name) {
        var doc = [],
            constraints = [],
            idx,
            sublevel,
            i,
            max;

        doc.push("<span class=sh_string>" + name + "</span>");

        if (data.cast) {
            doc.push("<span class=sh_keyword>" + data.cast + "</span>");
        }

        Object.each(data.constraints, function (k, c) {
            var txt = "<span class=sh_keyword>" + c + "</span>";

            if (k) {
                txt += "(" + JSON.stringify(k) + ")";
            }

            constraints.push(txt);
        });

        if (constraints.length) {
            doc.push("<span>[" + constraints.join(", ") + "]</span>");
        }

        if (data.doc) {
            doc.push(data.doc);
        }

        if (data.cast === "object") {
            for (idx in data.object) {
                sublevel = this.URIParameter(data.object[idx], idx);
                sublevel = sublevel.split("\n");
                for (i = 0, max = sublevel.length; i < max; ++i) {
                    sublevel[i] = "  " + sublevel[i];
                }

                doc.push("\n" + sublevel.join("\n"));


            }
        }


        // TODO output in columns for god sake!
        return doc.join("  ");
    },
    URIParameters: function (uri) {
        var doc = this.doc;
        doc.push("<h3>Parameters</h3>");
        doc.push("<pre class=sh_sourceCode>");
        ["query", "body"].forEach(function (t) {
            var idx;
            for (idx in uri[t]) {
                doc.push(this.URIParameter(uri[t][idx], idx));
            }
        }.bind(this));
        doc.push("</pre>");
    },
    URIResponse: function (uri) {
        var doc = this.doc;
        if (uri.response) {
            doc.push("<h3>Response</h3>");
            doc.push("<pre class=sh_sourceCode>");

            var idx;
            for (idx in uri.response) {
                doc.push(this.URIParameter(uri.response[idx], idx));
            }

            doc.push("</pre>");
        } else {
            doc.push("<h3>Response (not-defined)</h3>");
        }
    },

    loopUris: function (expresionist, uris) {
        var uri_list = [],
            order = ["get", "post", "put", "delete"],
            i,
            j,
            m,
            uri,
            uri_data,
            header;

        order.forEach(function (m) {
            Object.each(uris[m], function (v, k) {
                uri_list.push(v.uri);
            });
        });

        Array.unique(uri_list);
        uri_list.sort();

        for (i = 0; i < uri_list.length; ++i) {
            header = false;
            for (j = 0; j < order.length; ++j) {
                m = order[j];
                uri = uri_list[i];
                uri_data = uris[m][uri];


                if (uri_data !== undefined) {
                    if (!header) {
                        header = true;
                        this.URIHeader(expresionist, uri_data);
                    }

                    this.URIMethod(expresionist, uri_data);
                    this.URIDescription(expresionist, uri_data);
                    this.URIHooks(expresionist, uri_data);
                    this.URIParameters(uri_data);
                    this.URIResponse(uri_data);
                }
            }
        }
        return module.exports.doc.join("\n")
    }
};
