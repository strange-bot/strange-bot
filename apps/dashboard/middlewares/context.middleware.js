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
    // Set Locale
    if (!req.session.locale) {
        const coreConfig = await DBClient.getInstance().getPluginConfig("core");
        res.locals.coreConfig = coreConfig;
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

    next();
};

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const pluginContext = async (req, res, next) => {
    const { guildId, pluginName } = req.params;
    if (!pluginName) {
        return next();
    }

    const pluginManager = req.app.pluginManager;
    const plugin = pluginManager.getPlugin(pluginName);

    if (!plugin) {
        return res.status(404).send("Plugin not found");
    }

    const [settings, coreSettings, config] = await Promise.all([
        DBClient.getInstance().getPluginSettings(guildId, pluginName),
        DBClient.getInstance().getPluginSettings(guildId, "core"),
        plugin.getConfig(),
    ]);

    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        res.locals.coreConfig["DASHBOARD"]["LOGO_NAME"];

    res.locals.locale = req.locale;
    res.locals.tr = req.translate;
    res.locals.coreSettings = coreSettings;
    // res.locals.coreConfig = res.locals.coreConfig;
    // res.locals.guild = res.locals.guild;
    res.locals.user = req.user;
    res.locals.plugins = req.app.pluginManager.plugins;
    res.locals.plugin = plugin;
    res.locals.config = config;
    res.locals.settings = settings;

    res.locals.title = title;
    res.locals.slug = `/plugins/${plugin.name}`;
    res.locals.layout = "layouts/dashboard-tabbed";
    res.locals.breadcrumb = true;
};

module.exports = {
    baseContext,
    guildContext,
    pluginContext,
};
