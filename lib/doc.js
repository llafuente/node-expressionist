module.exports = {
    param: function (option, options) {
        "use strict";
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
                output += module.exports.param(option[i], options);
                if (option[i].ref) {
                    output += module.exports.param(options[option[i].ref], options);
                }
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
    },
    params: function (options, param_fn) {
        "use strict";
        var output = "",
            i,
            p;

        output += "<table>\n";

        for (p in options) {

            if (p[0] !== ":") {
                output += param_fn(options[p], options);
                if (options[p].ref) {
                    output += param_fn(options[options[p].ref], options);
                }
            }
        }

        output += "</table>\n";

        return output;
    },
    uri: function (api, uri, method, options, params_fn, param_fn) {
        "use strict";
        //console.log("#doc ", uri);
        var output = '',
            p,
            description,
            scope_order = ["params", "query"],
            i,
            hook;

        //console.log(methods[v][uri]);
        output += "<div class=\"method-container\">\n";
        output += "<h2 class=\"method\">" + method.toLocaleUpperCase() + "</h2>\n";
        output += "<div class=\"method-content\">\n";

        description = options.description || "todo";
        output += "<p>" + description + "</p>\n";

        // sort

        if (options.hooks.length) {
            output += "<div class=\"hooks-container\">\n";
            for (i = 0; i < options.hooks.length; ++i) {
                hook = api.get_hook(options.hooks[i]);
                output += "<p>\n";
                output += hook.docs.description;
                output += "</p>\n";
            }
            output += "</div>\n";
        }

        output += "<div class=\"input-container\">\n";
        output += "<h3 class=\"input-header\">Parameters</h3>\n";
        output += "<div class=\"input-content\">\n";
        output += params_fn(options.params, param_fn);
        output += "</div>\n";
        output += "</div>\n";

        output += "<div class=\"response-container\">\n";
        output += "<h3 class=\"response-header\">Response</h3>\n";
        output += "<div class=\"response-content\">\n";
        output += params_fn(options.response, param_fn);
        output += "</div>\n";
        output += "</div>\n";
        output += "</div>\n";
        output += "</div>\n";

        return output;
    }

};