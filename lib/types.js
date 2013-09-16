(function () {
    "use strict";
    var check = require('validator').check,
        sanitize = require('validator').sanitize;

    function xss_hash() {
        //TODO: Create a random hash
        return '!*$^#(@*#&';
    }

    function xssClean(str, is_image) {

        //Recursively clean objects and arrays
        if (typeof str === 'object') {
            for (var i in str) {
                str[i] = xssClean(str[i]);
            }
            return str;
        }

        //Remove invisible characters
        str = remove_invisible_characters(str);

        //Protect query string variables in URLs => 901119URL5918AMP18930PROTECT8198
        str = str.replace(/\&([a-z\_0-9]+)\=([a-z\_0-9]+)/i, xss_hash() + '$1=$2');

        //Validate standard character entities - add a semicolon if missing.  We do this to enable
        //the conversion of entities to ASCII later.
        str = str.replace(/(&\#?[0-9a-z]{2,})([\x00-\x20])*;?/i, '$1;$2');

        //Validate UTF16 two byte encoding (x00) - just as above, adds a semicolon if missing.
        str = str.replace(/(&\#x?)([0-9A-F]+);?/i, '$1;$2');

        //Un-protect query string variables
        str = str.replace(xss_hash(), '&');

        //Decode just in case stuff like this is submitted:
        //<a href="http://%77%77%77%2E%67%6F%6F%67%6C%65%2E%63%6F%6D">Google</a>
        try {
          str = decodeURIComponent(str);
        } catch (e) {
          // str was not actually URI-encoded
        }

        //Convert character entities to ASCII - this permits our tests below to work reliably.
        //We only convert entities that are within tags since these are the ones that will pose security problems.
        str = str.replace(/[a-z]+=([\'\"]).*?\1/gi, function(m, match) {
            return m.replace(match, convert_attribute(match));
        });

        //Remove invisible characters again
        str = remove_invisible_characters(str);

        //Convert tabs to spaces
        str = str.replace('\t', ' ');

        //Captured the converted string for later comparison
        var converted_string = str;

        //Remove strings that are never allowed
        for (var i in never_allowed_str) {
            str = str.replace(i, never_allowed_str[i]);
        }

        //Remove regex patterns that are never allowed
        for (var i in never_allowed_regex) {
            str = str.replace(new RegExp(i, 'i'), never_allowed_regex[i]);
        }

        //Compact any exploded words like:  j a v a s c r i p t
        // We only want to do this when it is followed by a non-word character
        for (var i in compact_words) {
            var spacified = compact_words[i].split('').join('\\s*')+'\\s*';

            str = str.replace(new RegExp('('+spacified+')(\\W)', 'ig'), function(m, compat, after) {
                return compat.replace(/\s+/g, '') + after;
            });
        }

        //Remove disallowed Javascript in links or img tags
        do {
            var original = str;

            if (str.match(/<a/i)) {
                str = str.replace(/<a\s+([^>]*?)(>|$)/gi, function(m, attributes, end_tag) {
                    attributes = filter_attributes(attributes.replace('<','').replace('>',''));
                    return m.replace(attributes, attributes.replace(/href=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi, ''));
                });
            }

            if (str.match(/<img/i)) {
                str = str.replace(/<img\s+([^>]*?)(\s?\/?>|$)/gi, function(m, attributes, end_tag) {
                    attributes = filter_attributes(attributes.replace('<','').replace('>',''));
                    return m.replace(attributes, attributes.replace(/src=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi, ''));
                });
            }

            if (str.match(/script/i) || str.match(/xss/i)) {
                str = str.replace(/<(\/*)(script|xss)(.*?)\>/gi, '');
            }

        } while(original != str);

        //Remove JavaScript Event Handlers - Note: This code is a little blunt.  It removes the event
        //handler and anything up to the closing >, but it's unlikely to be a problem.
        event_handlers = ['[^a-z_\-]on\\w*'];

        //Adobe Photoshop puts XML metadata into JFIF images, including namespacing,
        //so we have to allow this for images
        if (!is_image) {
            event_handlers.push('xmlns');
        }

        str = str.replace(new RegExp("<([^><]+?)("+event_handlers.join('|')+")(\\s*=\\s*[^><]*)([><]*)", 'i'), '<$1$4');

        //Sanitize naughty HTML elements
        //If a tag containing any of the words in the list
        //below is found, the tag gets converted to entities.
        //So this: <blink>
        //Becomes: &lt;blink&gt;
        naughty = 'alert|applet|audio|basefont|base|behavior|bgsound|blink|body|embed|expression|form|frameset|frame|head|html|ilayer|iframe|input|isindex|layer|link|meta|object|plaintext|style|script|textarea|title|video|xml|xss';
        str = str.replace(new RegExp('<(/*\\s*)('+naughty+')([^><]*)([><]*)', 'gi'), function(m, a, b, c, d) {
            return '&lt;' + a + b + c + d.replace('>','&gt;').replace('<','&lt;');
        });

        //Sanitize naughty scripting elements Similar to above, only instead of looking for
        //tags it looks for PHP and JavaScript commands that are disallowed.  Rather than removing the
        //code, it simply converts the parenthesis to entities rendering the code un-executable.
        //For example:    eval('some code')
        //Becomes:        eval&#40;'some code'&#41;
        str = str.replace(/(alert|cmd|passthru|eval|exec|expression|system|fopen|fsockopen|file|file_get_contents|readfile|unlink)(\s*)\((.*?)\)/gi, '$1$2&#40;$3&#41;');

        //This adds a bit of extra precaution in case something got through the above filters
        for (var i in never_allowed_str) {
            str = str.replace(i, never_allowed_str[i]);
        }
        for (var i in never_allowed_regex) {
            str = str.replace(new RegExp(i, 'i'), never_allowed_regex[i]);
        }

        //Images are handled in a special way
        if (is_image && str !== converted_string) {
            throw new Error('Image may contain XSS');
        }


        return str;
    }


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

                    return true;
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
            sanitize: function () {
                return value.trim();
            }
        },
        html: {
            id: "html",
            check: function (value, options) {
                return "string" === (typeof value);
            },
            sanitize: function (value) {
                return xssClean(decode(value.trim()));
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
                return "string" === (typeof value) && value.match(new RegExp('^(https?:\/\/)?'+ // protocol
                    '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
                    '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
                    '(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
                    '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
                    '(\#[-a-z\d_]*)?$','i')) !== null;

            },
            sanitize: function (value) {
                return value === undefined ? "" : ("" + value);
            }
        },
        date: {
            id: "date",
            check: function (value, options) { // check is a valid date
                return value instanceof Date;
            },
            sanitize: function (value) { // return new Date

                return (value instanceof Date) ? value : new Date(value);
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