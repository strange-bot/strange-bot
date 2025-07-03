const { Logger } = require("strange-sdk/utils");
const { languagesMeta } = require("strange-core");
const db = require("../../db.service");

const OWNER_IDS = process.env.OWNER_IDS.split(",");

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = async (req, res, next) => {
    const coreConfig = await req.app.pluginManager.getPlugin("core").getConfig();
    res.locals.coreConfig = coreConfig;

    // Set Locale
    if (!req.session.locale) {
        if (!req.session.user) {
            req.session.locale = coreConfig["LOCALE"]["DEFAULT"];
        } else {
            const dbLocale = await db.getLocale(req.session.user.info.id);
            req.session.locale = dbLocale || coreConfig["LOCALE"]["DEFAULT"];
        }
        req.session.save((err) => {
            if (err) Logger.error("Failed to save session", err);
        });
    }

    // Extra user methods
    if (req.session.user) {
        req.session.user.info.isOwner = OWNER_IDS.includes(req.session.user.info.id);
    }

    // Set translate
    if (!req.session.locale) req.session.locale = "en-US";
    req.translate = req.app.translations.get(req.session.locale);
    res.locals.languagesMeta = languagesMeta;
    res.locals.locale = req.session.locale;

    next();
};
