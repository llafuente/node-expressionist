module.exports = {
    login: function(req, res, next) {
        if (req.body.username === "test" && req.body.password === "test") {
            res.setResponse({success: true});
        }

        next();
    },
    session: function(req, res, next) {
        next();
    },
    ret_get: function(req, res, next) {
    	req.query.success = true;
    	res.setResponse(req.query);
    	next();
    },
    login_alt: function(username, password, req, res, next) {
        res.setResponse({
            username: username,
            password: password,
            success: true
        });

        next();
    }
};