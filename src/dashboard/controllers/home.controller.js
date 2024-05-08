const PluginManager = require("../../base/PluginManager");
const Settings = require("../../base/Settings");
const config = require("../../config");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.get = async function (req, res) {
    const guild = req.client.guilds.cache.get(req.params.serverId);
    if (!guild || !req.user.guilds.find((g) => g.id === req.params.serverId)) {
        return res.status(404).send("Not found");
    }

    const plugins = PluginManager.plugins.filter((p) => p.dashboard.enabled);
    const enabledPlugins = new Set();
    for (const [name, info] of Object.entries(Settings.get(guild).plugins)) {
        if (info.enabled) enabledPlugins.add(name);
    }

    res.render("home", {
        slug: "home",
        config,
        user: req.user,
        guild,
        plugins,
        enabledPlugins,
        tr: req.translate,

        layout: "layouts/dashboard",
        title: `${guild.name} | ${config.DASHBOARD.LOGO_NAME}`,
        breadcrumb: true,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.post = async function (req, res) {
    const guild = req.client.guilds.cache.get(req.params.serverId);
    if (!guild || !req.user.guilds.find((g) => g.id === req.params.serverId)) {
        return res.status(404).send("Not found");
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "plugin_enable")) {
        const plugin = req.client.pluginManager.plugins.find(
            (p) => p.name === req.body.plugin_enable,
        );
        if (!plugin) return res.status(404).send("Plugin not found");

        const settings = guild.getSettings(plugin.name);
        try {
            settings.enabled = true;
            await guild.updateSettings();
        } catch (error) {
            console.error(error);
            return res.status(500).send(error.message);
        }
    }

    res.redirect(`/dashboard/${guild.id}`);
};
