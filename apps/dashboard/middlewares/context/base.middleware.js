const { Logger } = require("strange-sdk/utils");
const DBClient = require("strange-db-client");

const OWNER_IDS = process.env.OWNER_IDS.split(",");

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = async (req, res, next) => {
    const coreConfig = await DBClient.getInstance().getPluginConfig("core");
    res.locals.coreConfig = coreConfig;

    // Set Locale
    if (!req.session.locale) {
        if (!req.session.user) {
            req.session.locale = coreConfig["DASHBOARD"]["DEFAULT_LOCALE"];
        } else {
            const dashConfig = DBClient.getInstance().getDashboardConfig(req.session.user.info.id);
            req.session.locale = dashConfig.locale;
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

    next();
};
