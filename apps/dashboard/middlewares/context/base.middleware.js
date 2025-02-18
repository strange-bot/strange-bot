const { Logger } = require("strange-sdk/utils");
const languages = require("strange-i18n/languages-meta.json");

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
            req.session.locale = coreConfig["DASHBOARD"]["DEFAULT_LOCALE"];
        } else {
            const Model = req.app.db.getModel("dashboard");
            const dashConfig = await Model.findOne({ _id: req.session.user.info.id }).lean();
            req.session.locale = dashConfig?.locale || coreConfig["DASHBOARD"]["DEFAULT_LOCALE"];
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
    req.translate = req.app.translations.get(req.session.locale);
    res.locals.languages = languages;
    res.locals.locale = req.session.locale;

    next();
};
