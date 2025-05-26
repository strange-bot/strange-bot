const db = require("../db.service");
const crypto = require("node:crypto");

/**
 * Middleware to check if the user is logged in
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.CheckAuth = async (req, res, next) => {
    if (!req.session.user?.info?.id) {
        const redirectURL = req.originalUrl;
        const state = crypto.randomBytes(16).toString("hex");
        try {
            await db.saveState(state, redirectURL);
            return res.redirect(`/auth/login?state=${state}`);
        } catch (err) {
            return res.status(500).send("Internal Server Error");
        }
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
