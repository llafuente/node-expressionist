module.exports = {
    preHook: function (req, res, next) {
        if (!req.cookies.session) {
            res.addError(403, "invalid-auth");
        }
        next();
    }
};