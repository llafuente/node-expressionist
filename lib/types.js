(function () {
    "use strict";
    var check = require('validator').check,
        sanitize = require('validator').sanitize;

    module.exports = {
        object: {
            id: "object",
            check: function (value, options) {
                return "object" === typeof value;
            },
            sanitize: function (value) {
                return value || {};
            }
        },
        number: {
            id: "number",
            check: function (value, options) {
                try {
                    check(value).isNumeric();
                } catch (e) {
                    return false;
                }
                return true;
            },
            sanitize: function (value) {
                return sanitize(value).toInt();
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
                return value instanceof Array;
            },
            sanitize: function (value) {
                return value instanceof Array ? value : [];
            }
        },
        sbool: {
            id: "strict-boolean",
            check: function (value, options) {
                return value === true || value === false;
            },
            sanitize: function (value) {
                return sanitize(value).toBooleanStrict();
            }
        },
        bool: {
            id: "boolean",
            check: function (value, options) {
                try {
                    check(value).isNumeric();
                } catch (e) {
                    return false;
                }
                return true;
            },
            sanitize: function (value) {
                return sanitize(value).toBooleanStrict();
            }
        },
        email: {
            id: "email",
            check: function (value, options) {
                try {
                    check(value).isEmail();
                } catch (e) {
                    return false;
                }
                return true;
            },
            sanitize: function (value) {
                return sanitize(value).trim();
            }
        },
        html: {
            id: "html",
            check: function (value, options) {
                return true;
            },
            sanitize: function (value) {
                return sanitize(value).trim().entityDecode().xss();
            }
        },
        string: {
            id: "string",
            check: function (value, options) {
                return value !== undefined;
            },
            sanitize: function (value) {
                return value === undefined ? "" : ("" + value);
            }
        },
        url: {
            id: "url",
            check: function (value, options) {
                return value !== undefined;
            },
            sanitize: function (value) {
                return value === undefined ? "" : ("" + value);
            }
        },
        date: {
            id: "date",
            check: function (value, options) { // check is a valid date
                return true;
            },
            sanitize: function (value) { // return new Date
                return value;
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