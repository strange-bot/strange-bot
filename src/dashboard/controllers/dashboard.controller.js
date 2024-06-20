const Settings = require("../../base/Settings");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getSelector = async function (req, res) {
    res.render("selector", {
        coreConfig: req.client.coreConfig,
        locale: req.locale,
        tr: req.translate,
        user: req.user,

        title: `Server Selector | ${req.client.coreConfig.get("DASHBOARD").LOGO_NAME}`,
        slug: "selector",
        breadcrumb: true,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getPlugins = async function (req, res) {
    const guild = req.client.guilds.cache.get(req.params.serverId);
    if (!guild || !req.user.guilds.find((g) => g.id === req.params.serverId)) {
        return res.status(404).send("Not found");
    }

    const enabledPlugins = new Set();
    for (const [name, info] of Object.entries(Settings.get(guild).plugins)) {
        if (info.enabled) enabledPlugins.add(name);
    }

    const coreConfig = req.client.coreConfig;

    res.render("home", {
        coreConfig,
        locale: req.locale,
        tr: req.translate,
        user: req.user,

        guild,
        plugins: req.client.pluginManager.plugins.filter((p) => !p.ownerOnly),
        enabledPlugins,

        title: `${guild.name} | ${coreConfig.get("DASHBOARD").LOGO_NAME}`,
        slug: "home",
        breadcrumb: true,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.postPlugins = async function (req, res) {
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
