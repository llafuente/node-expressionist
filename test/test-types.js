(function () {
    "use strict";

    var tap = require("tap"),
        util = require("util"),
        test = tap.test,
        api = require("../index.js").api,
        types = api.types,
        express = require("express"),
        app = express(),
        request = require("request"),
        server,
        req_timeout = 250;

    test("init api", function (t) {
        api = api(app);
        t.end();
    });


    test("objects", function (t) {
/*
    console.log(typeof 1010);
    console.log(1010 instanceof Number);
    process.exit();
    */

        t.equal(api.types.object.check({}), true, "object is object");
        t.equal(api.types.object.check([]), false, "Array is object");
        t.equal(api.types.object.check(new Date()), false, "Date is object");
        t.equal(api.types.object.check(Date), false, "Date is object");
        t.equal(api.types.object.check(Array), false, "Array is object");
        t.equal(api.types.object.check(1010), false, "Number is object");


        t.equal(api.types.number.check({}), false, "object is number");
        t.equal(api.types.number.check([]), false, "Array is number");
        t.equal(api.types.number.check(new Date()), false, "Date is number");
        t.equal(api.types.number.check(Date), false, "Date is number");
        t.equal(api.types.number.check(Array), false, "Array is number");
        t.equal(api.types.number.check(1010), true, "Number is number");
        t.equal(api.types.number.check("1010"), true, "Number(str) 1 is number");
        //todo: t.equal(api.types.number.check("1010.05"), true, "Number(str) 2 is number");
        //todo: t.equal(api.types.number.check("1e10"), true, "Number(str) is number");


        t.equal(api.types.string.check({}), false, "object is string");
        t.equal(api.types.string.check([]), false, "Array is string");
        t.equal(api.types.string.check(new Date()), false, "Date is string");
        t.equal(api.types.string.check(Date), false, "Date is string");
        t.equal(api.types.string.check(Array), false, "Array is string");
        t.equal(api.types.string.check(1010), false, "Number is string");
        t.equal(api.types.string.check("1010"), true, "Number(str) is string");
        t.equal(api.types.string.check("1010.05"), true, "Number(str) is string");
        t.equal(api.types.string.check("1e10"), true, "Number(str) is string");
        t.equal(api.types.string.check("<html>xxxz</html>"), true, "str is string");



        t.equal(api.types.array.check({}), false, "object is array");
        t.equal(api.types.array.check([]), true, "Array is array");
        t.equal(api.types.array.check(new Date()), false, "Date is array");
        t.equal(api.types.array.check(Date), false, "Date is array");
        t.equal(api.types.array.check(Array), false, "Array is array");
        t.equal(api.types.array.check(1010), false, "Number is array");
        t.equal(api.types.array.check("1010"), false, "Number(str) is array");
        t.equal(api.types.array.check("1010.05"), false, "Number(str) is array");
        t.equal(api.types.array.check("1e10"), false, "Number(str) is array");
        t.equal(api.types.array.check("<html>xxxz</html>"), false, "str is array");


        t.equal(api.types.array_of_numbers.check({}), false, "object is array");
        t.equal(api.types.array_of_numbers.check([]), true, "Array is array");
        t.equal(api.types.array_of_numbers.check([1,2,3]), true, "Array is array");
        t.equal(api.types.array_of_numbers.check([1,"2",3]), true, "Array is array");
        t.equal(api.types.array_of_numbers.check([1,"abc",3]), false, "Array is array");
        t.equal(api.types.array_of_numbers.check(new Date()), false, "Date is array");
        t.equal(api.types.array_of_numbers.check(Date), false, "Date is array");
        t.equal(api.types.array_of_numbers.check(Array), false, "Array is array");
        t.equal(api.types.array_of_numbers.check(1010), false, "Number is array");
        t.equal(api.types.array_of_numbers.check("1010"), false, "Number(str) is array");
        t.equal(api.types.array_of_numbers.check("1010.05"), false, "Number(str) is array");
        t.equal(api.types.array_of_numbers.check("1e10"), false, "Number(str) is array");
        t.equal(api.types.array_of_numbers.check("<html>xxxz</html>"), false, "str is array");





        t.end();
    });


}());

// t.deepEqual(Array.prototype.slice.call(arguments), [ "say", "hello" ], "arguments missmatch");