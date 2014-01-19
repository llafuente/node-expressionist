(function () {
    "use strict";

    var fs = require("fs"),
        util  = require("util");

    function str_pad(input, pad_length, pad_string, pad_type) {
        // From: http://phpjs.org/functions
        // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // + namespaced by: Michael White (http://getsprink.com)
        // +      input by: Marco van Oort
        // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
        // *     example 1: str_pad('Kevin van Zonneveld', 30, '-=', 'STR_PAD_LEFT');
        // *     returns 1: '-=-=-=-=-=-Kevin van Zonneveld'
        // *     example 2: str_pad('Kevin van Zonneveld', 30, '-', 'STR_PAD_BOTH');
        // *     returns 2: '------Kevin van Zonneveld-----'
        var half = '',
            pad_to_go;

        var str_pad_repeater = function (s, len) {
            var collect = '',
                i;

            while (collect.length < len) {
                collect += s;
            }
            collect = collect.substr(0, len);

            return collect;
        };

        input += '';
        pad_string = pad_string !== undefined ? pad_string : ' ';

        if (pad_type !== 'STR_PAD_LEFT' && pad_type !== 'STR_PAD_RIGHT' && pad_type !== 'STR_PAD_BOTH') {
            pad_type = 'STR_PAD_RIGHT';
        }
        if ((pad_to_go = pad_length - input.length) > 0) {
            if (pad_type === 'STR_PAD_LEFT') {
                input = str_pad_repeater(pad_string, pad_to_go) + input;
            } else if (pad_type === 'STR_PAD_RIGHT') {
                input = input + str_pad_repeater(pad_string, pad_to_go);
            } else if (pad_type === 'STR_PAD_BOTH') {
                half = str_pad_repeater(pad_string, Math.ceil(pad_to_go / 2));
                input = half + input + half;
                input = input.substr(0, pad_length);
            }
        }

        return input;
    }





    function columnize(arr) {
        var i,
            max,
            llen = [],
            len,
            max_len = [],
            flattern = [],
            j,
            jmax,
            z,
            zmax,
            t;


    //if (arr.length > 6) { process.exit(); }
        for (i = 0, max = arr.length; i < max; ++i) {
            if (arr[i].length > 1) {
                len = [];
                for (j = 0, jmax = arr[i].length; j < jmax; ++j) {
                    if (arr[i][j].indexOf("\n") !== -1) {
                        t = arr[i][j].split("\n");
                        for (z = 0, zmax = t.length; z < zmax; ++z) {
                            len[j] = Math.max(len[j] || 0, t[z].length);
                        }

                    } else {
                        len[j] = Math.max(len[j] || 0, arr[i][j].length);
                    }
                }
                llen[i] = len;
            } else {
                llen[i] = false;
            }
        }


        for (i = 0, max = llen.length; i < max; ++i) {
            jmax = llen[i].length;
            max_len[jmax] = max_len[jmax] || [];
            for (j = 0; j < jmax; ++j) {
                max_len[jmax][j] = Math.max(max_len[jmax][j] || 0, llen[i][j]);
            }
        }

        //console.log(arr);
        //console.log("max length", max_len);

        for (i = 0, max = arr.length; i < max; ++i) {
            jmax = arr[i].length;

            if (jmax > 1) {
                t = '';
                for (j = 0, jmax = arr[i].length; j < jmax; ++j) {
                    t += str_pad(arr[i][j], max_len[jmax][j], " ", 'STR_PAD_RIGHT') + "  ";
                }
                flattern[i] = t;
            } else {
                flattern[i] = arr[i][0];
            }

        }


        return flattern;
    }
    /*
    console.log(
        columnize(
    [ [ '  <span class="name">username</span>',
        '<span class="type">string</span>',
        '',
        '' ],
      [ '  <span class="name">email</span>',
        '<span class="type">string</span>',
        '',
        '' ],
      [ '  <span class="name">services</span>',
        '<span class="type">array</span>',
        '',
        '' ] ]

    ).join("\n")
    );
    process.exit();

    console.log(
        columnize([
            ["123", "111"],
            ["12", "000"],
            ["xxxxxxxxx ******"]
        ]).join("\n")
    );
    process.exit();

    */

    module.exports = {
        doc: null,
        URIHeader: function (expresionist, uridata) {
            var id = uridata.uri.replace(/[\/:]/g, "");
            this.doc.push('<a name="' + id + '"></a>');
            this.doc.push('<h1 id="' + id + '">' + uridata.uri + "</h1>");
        },
        URIMethod: function (expresionist, uridata) {
            this.doc.push("<h2>" + uridata.method.toUpperCase() + "</h2>");
        },
        URIDescription: function (expresionist, uridata) {
            if (!uridata.doc) {
                console.warn("#(documentator) unexpected empty uri doc", uridata.method + ":" + uridata.uri);
            } else {
                this.doc.push("<p>" + uridata.doc.trim().replace("\n", "<br />\n") + "</p>");
            }
        },
        URIHooks: function (expresionist, uridata) {
            var htxt = [];

            ["requestHooks", "responseHooks"].forEach(function (t) {
                uridata[t].forEach(function (k, kk) {
                    var hook = expresionist.hooks[t === "requestHooks" ? "request" : "response"][k];
                    if (hook.doc) {
                        htxt.push(hook.doc.trim().replace("\n", "<br />\n"));
                    }

                });
            });

            if (htxt.length) {
                this.doc.push("<h3>Notes</h3>");
                this.doc.push("<ul><li>" + htxt.join("</li><li>") + "</li></ul>");
            }
        },
        URIParameter: function (data, name, lines) {
            var line = [],
                subline = [],
                constraints = [],
                idx,
                sublevel,
                i,
                max;

            Object.each(data.constraints, function (extra, name) {
                var txt = name;

                if (extra) {
                    txt += "(" + JSON.stringify(extra) + ")";
                }

                constraints.push(txt);
            });

            line.push('  <span class="name">' + name + "</span>");
            line.push(data.cast ? ('<span class="type">' + data.cast + "</span>") : "");
            line.push(constraints.length ? ('<span class="constraints">[' + constraints.join(", ") + "]</span>") : " ");
            line.push(data.doc || "");

            lines.push(line);

            if (data.cast === "object") {
                for (idx in data.object) {
                    subline = [];
                    this.URIParameter(data.object[idx], idx, subline);

                    for (i = 0, max = subline.length; i < max; ++i) {
                        subline[i].unshift("  ");
                        lines.push(subline[i]);
                    }

                }
            } else if (data.cast === "array") {
                for (idx in data.items) {
                    subline = [];
                    this.URIParameter(data.items[idx], idx, subline);

                    for (i = 0, max = subline.length; i < max; ++i) {
                        subline[i].unshift("  ");
                        lines.push(subline[i]);
                    }

                }
            }

        },
        URIParameterHeader: function (t, doc) {
            switch (t) {
            case "params":
                doc.push("PARAMS:");
                break;
            case "body":
                doc.push("POST:");
                break;
            case "files":
                doc.push("FILES:");
                break;
            case "query":
                doc.push("GET:");
                break;
            }
        },
        URIParameters: function (uri) {
            var doc = this.doc,
                pdoc = [],
                headers = {};
            doc.push("<h3>Parameters</h3>");
            doc.push('<pre class="parameters">');
            ["params", "query", "body"].forEach(function (t) {
                var idx;
                for (idx in uri[t]) {
                    if (!headers[t]) {
                        headers[t] = true;
                        this.URIParameterHeader(t, doc);
                    }
                    this.URIParameter(uri[t][idx], idx, pdoc);
                }

                if (pdoc.length) {
                    doc.push(columnize(pdoc).map(function(v) {return v.replace(/\s+$/, '');}).join("\n"));
                    pdoc = [];
                }
            }.bind(this));
            doc.push("</pre>");
        },
        URIResponse: function (uri) {
            var doc = this.doc,
                pdoc = [];
            if (uri.response) {
                doc.push("<h3>Response</h3>");
                doc.push('<pre class="parameters">');

                var idx;
                for (idx in uri.response) {
                    this.URIParameter(uri.response[idx], idx, pdoc);
                }
                doc.push(columnize(pdoc).map(function(v) {return v.replace(/\s+$/, '');}).join("\n"));

                doc.push("</pre>");
            } else {
                doc.push("<h3>Response (not-defined)</h3>");
            }
        },

        loopUris: function (expresionist, uris, groups) {
            //console.log(util.inspect(uris, {depth: 5, colors: true}));


            var uri_list,
                all_uris = [],
                order = ["get", "post", "put", "delete", "patch", "head"],
                i,
                j,
                m,
                uri,
                uri_data,
                header,
                index;

            module.exports.doc = [
                '<link rel="stylesheet" href="documentator.css">',
                '<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>',
                '<script src="./documentator.html.js"></script>',
                '', // reserve for index
                '<div id="content">' // reserve for index
            ];
            groups = groups || [false];

            groups.forEach(function (group) {
                uri_list = [];
                order.forEach(function (m) {
                    Object.each(uris[m], function (v, k) {
                        if (group === false || group === v.group) {
                            uri_list.push(v.uri);
                        }
                    });
                });

                uri_list = Array.unique(uri_list);
                uri_list.sort();

                Array.combine(all_uris, uri_list);

                for (i = 0; i < uri_list.length; ++i) {
                    uri = uri_list[i];
                    console.info("(documentator) export ", uri, group);
                    header = false;
                    for (j = 0; j < order.length; ++j) {
                        m = order[j];
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
                    module.exports.doc.push("<hr />");
                }
            }.bind(this));

            // index
            index = [];

            for (i = 0; i < all_uris.length; ++i) {
                index.push('<a href="#' + all_uris[i].replace(/[\/:]/g, "") + '">' + all_uris[i] + '</a>');
            }

            module.exports.doc[3] = '<div id="index"><ul><li>' + index.join("</li><li>") + "</li></ul></div>";
            module.exports.doc.push("</div>");// close content

            return module.exports.doc.join("\n");
        }
    };

}());