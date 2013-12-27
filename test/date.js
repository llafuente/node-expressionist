module.exports = {
    diff: function (req, res, next) {
        res.setResponse({
            success: true,
            diff: req.query.date.getTime() - (new Date("2013-01-01 13:00:00")).getTime()
        });

        next();
    },
    server: function (req, res, next) {
    	res.setResponse({
            success: true,
    		date: new Date("2013-01-01 13:00:00")	
    	});

    	next();
    }
};