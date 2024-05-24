/**
 * Middleware to check if the user is logged in
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {import('strange-sdk').Plugin} plugin
 */
module.exports = async (req, res, next, plugin) => {
    const guild = req.client.guilds.cache.get(req.params.serverId);
    if (!guild || !req.user.guilds.find((g) => g.id === req.params.serverId)) {
        return res.status(404).send("Not found");
    }

    const coreSettings = guild.getSettings("core");
    const settings = guild.getSettings(plugin.name);

    // Plugin Status Toggle
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

    // Prefix Commands Toggle
    if (
        req.method === "POST" &&
        Object.prototype.hasOwnProperty.call(req.body, "prefix_commands_toggle")
    ) {
        try {
            const keys = Object.keys(req.body);
            const filtered = keys.filter((key) => req.body[key] === "on");
            const disabled = new Set();
            plugin.commands.forEach((cmd) => {
                if (cmd.command.enabled && !filtered.includes(cmd.name)) {
                    disabled.add(cmd.name);
                    cmd.command.aliases?.forEach((alias) => disabled.add(alias));
                }
            });

            coreSettings.disabled_prefix = Array.from(disabled);
            await guild.updateSettings();

            return res.redirect(`/dashboard/${guild.id}/${plugin.name}`);
        } catch (error) {
            console.error(error);
            return res.status(500).send(error.message);
        }
    }

    // Slash Commands Toggle
    if (
        req.method === "POST" &&
        Object.prototype.hasOwnProperty.call(req.body, "slash_commands_toggle")
    ) {
        try {
            const keys = Object.keys(req.body);
            const filtered = keys.filter(
                (key) => key !== "slash_commands_toggle" && req.body[key] === "off",
            );
            const disabled = new Set();
            plugin.commands.forEach((cmd) => {
                if (cmd.enabled && cmd.command.enabled && filtered.includes(cmd.name)) {
                    disabled.add(cmd.name);
                    cmd.command.aliases?.forEach((alias) => disabled.add(alias));
                }
            });

            coreSettings.disabled_slash = Array.from(disabled);
            await guild.updateSettings();

            return res.redirect(`/dashboard/${guild.id}/${plugin.name}`);
        } catch (error) {
            console.error(error);
            return res.status(500).send(error.message);
        }
    }

    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        req.client.coreConfig.get("DASHBOARD").LOGO_NAME;

    res.locals.tr = req.translate;
    res.locals.coreSettings = coreSettings;
    res.locals.coreConfig = req.client.coreConfig;
    res.locals.guild = guild;
    res.locals.user = req.user;
    res.locals.plugins = req.client.pluginManager.plugins.filter((p) => !p.ownerOnly);
    res.locals.plugin = plugin;
    res.locals.settings = settings;

    res.locals.title = title;
    res.locals.slug = `/plugins/${plugin.name}`;
    res.locals.layout = "layouts/dashboard-tabbed";
    res.locals.breadcrumb = true;

    return next();
};
