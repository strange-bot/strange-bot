/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.dashboard = async (req, res, next) => {
    const { guildId, pluginName } = req.params;
    const plugin = req.app.pluginManager.getPlugin(pluginName);

    if (!plugin) {
        return res.status(404).send("Plugin not found");
    }

    // PUT route
    if (req.method === "PUT") {
        const { guildId, pluginName } = req.params;

        // Plugin Status Toggle
        if (req.query.operation && req.query.operation === "toggle") {
            try {
                const shouldEnable = Boolean(req.body.plugin_toggle);
                if (shouldEnable) {
                    await req.app.pluginManager.enableInGuild(pluginName, guildId);

                    const ipcResp = await req.app.ipcClient.broadcastOne(
                        "updatePlugin",
                        {
                            pluginName: plugin.name,
                            action: "guildEnable",
                        },
                        { guildId },
                    );

                    if (ipcResp?.success === false) {
                        await req.app.pluginManager.disableInGuild(pluginName);
                        throw new Error("Failed to enable plugin on other instances");
                    }
                } else {
                    await req.app.pluginManager.disableInGuild(pluginName, guildId);
                    const ipcResp = await req.app.ipcClient.broadcastOne(
                        "updatePlugin",
                        {
                            pluginName: plugin.name,
                            action: "guildDisable",
                            guildId: guildId,
                        },
                        { guildId },
                    );
                    if (ipcResp?.success === false) {
                        await req.app.pluginManager.enableInGuild(pluginName);
                        throw new Error("Failed to disable plugin on other instances");
                    }
                }

                return res.sendStatus(200);
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }

        // Prefix Commands Toggle
        if (req.query.operation && req.query.operation === "prefix_commands_toggle") {
            try {
                const keys = Object.keys(req.body);
                const filtered = keys
                    .filter((key) => key !== "prefix_commands_toggle" && req.body[key] === "on")
                    .map((key) => key.split("prefix_")[1]);

                const ipcResp = await req.app.ipcClient.broadcastOne(
                    "getPluginCmds",
                    {
                        pluginName,
                        type: "prefix",
                    },
                    {
                        guildId,
                    },
                );
                const pluginCmds = ipcResp.success ? ipcResp.data : { prefix: [], slash: [] };

                const disabled = new Set();
                pluginCmds.prefix.forEach((cmd) => {
                    if (!filtered.includes(cmd.name)) {
                        disabled.add(cmd.name);
                        cmd.aliases?.forEach((alias) => disabled.add(alias));
                    }
                });

                const coreSettings = await req.app.pluginManager
                    .getPlugin("core")
                    .dbService.getSettings(guildId);

                coreSettings.disabled_prefix = Array.from(disabled);
                await coreSettings.save();

                return res.sendStatus(200);
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }

        // Slash Commands Toggle
        if (req.query.operation && req.query.operation === "slash_commands_toggle") {
            try {
                const keys = Object.keys(req.body);
                const filtered = keys
                    .filter((key) => key !== "slash_commands_toggle" && req.body[key] === "on")
                    .map((key) => key.split("slash_")[1]);

                const ipcResp = await req.app.ipcClient.broadcastOne(
                    "getPluginCmds",
                    {
                        pluginName,
                        type: "slash",
                    },
                    {
                        guildId,
                    },
                );
                const pluginCmds = ipcResp.success ? ipcResp.data : { prefix: [], slash: [] };

                const disabled = new Set();
                pluginCmds.slash.forEach((cmd) => {
                    if (!filtered.includes(cmd.name)) {
                        disabled.add(cmd.name);
                    }
                });

                const coreSettings = await req.app.pluginManager
                    .getPlugin("core")
                    .dbService.getSettings(guildId);
                coreSettings.disabled_slash = Array.from(disabled);
                await coreSettings.save();

                return res.sendStatus(200);
            } catch (error) {
                console.error(error);
                return res.status(500).send(error.message);
            }
        }
    }

    // Broadcast
    req.broadcast = function (eventName, data, options) {
        const event = `${plugin.name}:${eventName}`;
        return req.app.ipcClient.broadcast(event, data, options);
    };

    req.broadcastOne = function (eventName, data, options) {
        const event = `${plugin.name}:${eventName}`;
        return req.app.ipcClient.broadcastOne(event, data, options);
    };

    const [coreSettings, config] = await Promise.all([
        req.app.pluginManager.getPlugin("core").dbService.getSettings(guildId),
        plugin.getConfig(),
    ]);

    const ipcResp = await req.app.ipcClient.broadcastOne(
        "getPluginCmds",
        {
            pluginName,
        },
        {
            guildId,
        },
    );
    const pluginCmds = ipcResp.success ? ipcResp.data : { prefix: [], slash: [] };

    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        res.locals.coreConfig["DASHBOARD"]["LOGO_NAME"];

    res.locals.locale = req.session.locale;
    res.locals.tr = req.translate;
    res.locals.coreSettings = coreSettings;
    res.locals.user = req.session.user.info;
    res.locals.plugins = req.app.pluginManager.plugins;
    res.locals.enabledPlugins = req.app.pluginManager.plugins.filter((p) =>
        coreSettings.enabled_plugins.includes(p.name),
    );
    res.locals.plugin = plugin;
    res.locals.pluginCmds = pluginCmds;
    res.locals.config = config;

    res.locals.title = title;
    res.locals.slug = `/plugins/${plugin.name}`;
    res.locals.layout = "layouts/dashboard-tabbed";
    res.locals.breadcrumb = true;

    next();
};

/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.admin = async (req, res, next) => {
    const { pluginName } = req.params;
    const plugin = req.app.pluginManager.getPlugin(pluginName);

    if (!plugin) {
        return res.status(404).send("Plugin not found");
    }

    const coreConfig = res.locals.coreConfig;
    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        coreConfig["DASHBOARD"]["LOGO_NAME"];

    req.broadcast = function (eventName, data) {
        const event = `${plugin.name}:${eventName}`;
        return req.app.ipcClient.broadcast(event, data);
    };

    req.boardcastOne = function (eventName, data, targetOptions) {
        const event = `${plugin.name}:${eventName}`;
        return req.app.ipcClient.broadcastOne(event, data, targetOptions);
    };

    res.locals.tr = req.translate;
    res.locals.coreConfig = coreConfig;
    res.locals.user = req.session.user.info;
    res.locals.plugins = req.app.pluginManager.plugins;
    res.locals.plugin = plugin;
    res.locals.config = await plugin.getConfig();

    res.locals.title = title;
    res.locals.slug = `/plugins/${plugin.name}`;
    res.locals.breadcrumb = true;
    res.locals.layout = "layouts/admin";

    return next();
};
