module.exports = {
    preHook: function (req, res, next) {
        if (!req.cookies.session) {
            // start a new one!
            // res.cookie('session', 1, { maxAge: minute });
        }

        next();
    }
};