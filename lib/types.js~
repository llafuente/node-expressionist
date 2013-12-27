(function () {
    "use strict";
    var check = require('validator').check,
        sanitize = require('validator').sanitize;

    module.exports = {
        object: {
            id: "object",
            check: function (value, options) {
                // need to be more strict ?
                return "object" === typeof value && !(value instanceof Array) && !(value instanceof Date);
            },
            sanitize: function (value) {
                return value || {};
            }
        },
        mixed: {
            id: "mixed",
            check: function (value, options) {
                // need to be more strict ?
                return true;
            },
            sanitize: function (value) {
                return value;
            }
        },
        json_string: {
            id: "json-string",
            check: function (value, options) {
                return module.exports.string.check(value, options);
            },
            sanitize: function (value) {
                return JSON.parse(value);
            }
        },
        number: {
            id: "number",
            // @todo support 1e10
            // @todo support 0.10
            check: function (value, options) {
                var t = typeof value;
                return "number" === t || ("string" === t && value.match(/^-?[0-9]+$/) !== null);
            },
            sanitize: function (value) {
                return parseFloat(value);
            }
        },
        array: {
            id: "array",
            check: function (value, options) {
                return value instanceof Array;
            },
            sanitize: function (value) {
                return value instanceof Array ? value : [];
            }
        },
        // todo
        array_of_numbers: {
            id: "array of numbers",
            check: function (value, options) {
                var i;
                if (value instanceof Array) {
                    for (i = 0; i < value.length; ++i) {
                        if (!module.exports.number.check(value[i])) {
                            return false;
                        }
                    }

                    return true;
                }
                return false;
            },
            sanitize: function (value) {
                var i;
                if (value instanceof Array) {
                    for (i = 0; i < value.length; ++i) {
                        value[i] = module.exports.number.sanitize(value[i]);
                    }

                    return value;
                }
                return [];
            }
        },
        sbool: {
            id: "strict-boolean",
            check: function (value, options) {
                return value === true || value === false || value === 1 || value === 0;
            },
            sanitize: function (value) {
                return value === true || value === 1;
            }
        },
        bool: {
            id: "boolean",
            check: function (value, options) {
                return value === true || value === false || value === 1 || value === 0 || value === "true" || value === "false";
            },
            sanitize: function (value) {
                return value === true || value === 1 || value === "true";
            }
        },
        email: {
            id: "email",
            check: function (value, options) {
                return value.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/);
            },
            sanitize: function (value) {
                return value.trim();
            }
        },
        html: {
            id: "html",
            check: function (value, options) {
                return "string" === (typeof value);
            },
            sanitize: function (value) {
                return check(value).trim().xss();
            }
        },
        string: {
            id: "string",
            check: function (value, options) {
                return "string" === (typeof value);
            },
            sanitize: function (value) {
                return "" + value;
            }
        },
        url: {
            id: "url",
            // http://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-an-url
            check: function (value, options) {
                return "string" === (typeof value) && value.match(new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?")) !== null;
            },
            sanitize: function (value) {
                return value === undefined ? "" : ("" + value);
            }
        },
        date: {
            id: "date",
            check: function (value, options) { // check is a valid date
                /*
                return true;
                console.log(value);
                console.log();
                process.exit();
                value instanceof Date
                */
                return Date.parse(value) > 0 || value instanceof Date;
            },
            sanitize: function (value) { // return new Date
                return (value instanceof Date) ? value : new Date(Date.parse(value));
            }
        },
        in: {
            id: "in",
            check: function (value, options) { // check is a valid date
                return options.values.indexOf(value) !== -1;
            },
            sanitize: function (value) { // return new Date
                return value;
            }
        }
    };

}());