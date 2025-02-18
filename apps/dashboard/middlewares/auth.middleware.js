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
        await req.app.db.addToCache(`dashboard:states:${state}`, redirectURL, 60);
        return res.redirect(`/auth/login?state=${state}`);
    }
    return next();
};

/**
 * Middleware to check if the user is an admin
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.CheckAdmin = async (req, res, next) => {
    if (!req.session.user?.info.isOwner) {
        return res.redirect("/dashboard");
    }

    return next();
};
