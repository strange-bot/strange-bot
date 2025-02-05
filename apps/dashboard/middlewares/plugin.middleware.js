const DBClient = require("strange-db-client");

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = async (req, res, next) => {
    // GET route
    if (req.method === "GET") {
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

        const ipcResp = await req.app.ipcServer.broadcast("dashboard:GET_PLUGIN_CMDS", {
            guildId,
            pluginName,
        });
        const pluginCmds = ipcResp.find((r) => r.success && r.data !== null).data;

        const title =
            plugin.name.charAt(0).toUpperCase() +
            plugin.name.slice(1) +
            " | " +
            res.locals.coreConfig["DASHBOARD"]["LOGO_NAME"];

        res.locals.locale = req.session.locale;
        res.locals.tr = req.translate;
        res.locals.coreSettings = coreSettings;
        res.locals.user = req.session.user.info;
        res.locals.plugins = pluginManager.plugins;
        res.locals.plugin = plugin;
        res.locals.pluginCmds = pluginCmds;
        res.locals.config = config;
        res.locals.settings = settings;

        res.locals.title = title;
        res.locals.slug = `/plugins/${plugin.name}`;
        res.locals.layout = "layouts/dashboard-tabbed";
        res.locals.breadcrumb = true;
    }

    // POST route
    if (req.method === "POST") {
        const { guildId, pluginName } = req.params;
        const settings = await DBClient.getInstance().getPluginSettings(guildId, pluginName);

        // Plugin Status Toggle
        if (Object.prototype.hasOwnProperty.call(req.body, "plugin_toggle")) {
            try {
                settings.enabled = Boolean(req.body.plugin_toggle);
                await DBClient.getInstance().updatePluginSettings(guildId, pluginName, settings);
                return res.status(200).send("Success");
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }

        // Prefix Commands Toggle
        if (Object.prototype.hasOwnProperty.call(req.body, "prefix_commands_toggle")) {
            try {
                const keys = Object.keys(req.body);
                const filtered = keys
                    .filter((key) => key !== "prefix_commands_toggle" && req.body[key] === "on")
                    .map((key) => key.split("prefix_")[1]);

                const ipcResp = await req.app.ipcServer.broadcast("dashboard:GET_PLUGIN_CMDS", {
                    guildId,
                    pluginName,
                });
                const pluginCmds = ipcResp.find((r) => r.success && r.data !== null).data;

                const disabled = new Set();
                pluginCmds.forEach((cmd) => {
                    if (cmd.command?.enabled && !filtered.includes(cmd.name)) {
                        disabled.add(cmd.name);
                        cmd.command.aliases?.forEach((alias) => disabled.add(alias));
                    }
                });

                const coreSettings = await DBClient.getInstance().getPluginSettings(
                    guildId,
                    "core",
                );
                coreSettings.disabled_prefix = Array.from(disabled);
                await DBClient.getInstance().updatePluginSettings(guildId, "core", coreSettings);

                return res.redirect(`/dashboard/${guildId}/${pluginName}`);
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }

        // Slash Commands Toggle
        if (Object.prototype.hasOwnProperty.call(req.body, "slash_commands_toggle")) {
            try {
                const keys = Object.keys(req.body);
                const filtered = keys
                    .filter((key) => key !== "slash_commands_toggle" && req.body[key] === "on")
                    .map((key) => key.split("slash_")[1]);

                const ipcResp = await req.app.ipcServer.broadcast("dashboard:GET_PLUGIN_CMDS", {
                    guildId,
                    pluginName,
                });

                const pluginCmds = ipcResp.find((r) => r.success && r.data !== null).data;
                const disabled = new Set();
                pluginCmds.forEach((cmd) => {
                    if (cmd.slashCommand?.enabled && !filtered.includes(cmd.name)) {
                        disabled.add(cmd.name);
                    }
                });

                const coreSettings = await DBClient.getInstance().getPluginSettings(
                    guildId,
                    "core",
                );
                coreSettings.disabled_slash = Array.from(disabled);
                await DBClient.getInstance().updatePluginSettings(guildId, "core", coreSettings);

                return res.redirect(`/dashboard/${guildId}/${pluginName}`);
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }
    }

    next();
};
