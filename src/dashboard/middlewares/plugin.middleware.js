const config = require("../../config");

/**
 * Middleware to check if the user is logged in
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {import('../../base/Plugin')} plugin
 */
module.exports = async (req, res, next, plugin) => {
    const guild = req.client.guilds.cache.get(req.params.serverId);
    if (!guild || !req.user.guilds.find((g) => g.id === req.params.serverId)) {
        return res.status(404).send("Not found");
    }

    const settings = guild.getSettings(plugin.name);

    // Enable/disable the plugin
    if (req.method === "POST" && Object.prototype.hasOwnProperty.call(req.body, "plugin_toggle")) {
        try {
            settings.enabled = Boolean(req.body.plugin_toggle);
            await guild.updateSettings();
            return res.status(200).send("Success");
        } catch (error) {
            console.error(error);
            return res.status(500).send(error.message);
        }
    }

    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        config.DASHBOARD.LOGO_NAME;

    req.renderData = {
        slug: "plugins/" + plugin.name,
        guild,
        user: req.user,
        plugin,
        plugins: req.client.pluginManager.plugins.filter((p) => p.dashboard.enabled),
        config,
        settings,
        tr: req.translate,

        title,
        layout: "layouts/dashboard",
        breadcrumb: true,
    };

    return next();
};
