const { Logger } = require("strange-sdk/utils");
const DBClient = require("strange-db-client");

const OWNER_IDS = process.env.OWNER_IDS.split(",");

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const baseContext = async (req, res, next) => {
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
        req.session.user.isOwner = OWNER_IDS.includes(req.session.user.info.id);
    }

    // Set translate
    req.translate = req.app.translations.get(req.session.locale);

    next();
};

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const guildContext = async (req, res, next) => {
    if (!req.params.guildId) {
        return next();
    }

    const responses = await req.app.ipcServer.broadcast(
        "dashboard:VALIDATE_GUILD",
        req.params.guildId,
    );
    const hasGuild = responses.some((r) => r.success && r.data === true);
    if (!hasGuild) {
        return res.status(404).send("Guild not found");
    }

    res.locals.guild = req.session.user.guilds.find((guild) => guild.id === req.params.guildId);
    next();
};

module.exports = {
    baseContext,
    guildContext,
};
