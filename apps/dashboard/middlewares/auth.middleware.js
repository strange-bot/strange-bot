const DBClient = require("strange-db-client");

/**
 * Middleware to check if the user is logged in
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.CheckAuth = async (req, res, next) => {
    if (!req.session.user?.info?.id) {
        const redirectURL =
            req.originalUrl.includes("login") || req.originalUrl === "/"
                ? "/dashboard"
                : req.originalUrl;
        const state = Math.random().toString(36).substring(5);
        await DBClient.getInstance().addToCache(`dashboard:${state}`, redirectURL, 60 * 5);
        return res.redirect(`/auth/login?state=${state}`);
    }
    return next();
};
