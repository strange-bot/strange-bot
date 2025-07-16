const { PermissionsBitField } = require("discord.js");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.serverSelector = async function (req, res) {
    const coreConfig = await req.app.pluginManager.getPlugin("core").getConfig();

    // Populate user guild data
    const guilds = req.session.user.guilds;
    const responses = await req.app.ipcServer.broadcast("dashboard:GET_BOT_GUILDS");
    const botGuildIds = responses.filter((r) => r.success).flatMap((r) => r.data || []);

    guilds.forEach((guild) => {
        if (guild.owner) guild.admin = true;
        if (guild.permissions) {
            const perms = new PermissionsBitField(BigInt(guild.permissions));
            guild.admin = perms.has(PermissionsBitField.Flags.Administrator);
        }
        // TODO: Check if the bot is in the guild
        const botInGuild = botGuildIds.includes(guild.id);
        guild.settingsUrl = botInGuild
            ? `/dashboard/${guild.id}`
            : `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot+applications.commands&permissions=1374891929078` +
              `&guild_id=${guild.id}`;
        guild.iconURL = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
            : "https://discordemoji.com/assets/emoji/discordcry.png";
    });

    res.render("dashboard/server-selector", {
        coreConfig: coreConfig,
        locale: req.session.locale,
        tr: req.translate,
        user: req.session.user.info,
        guilds: req.session.user.guilds,

        title: `Server Selector | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "selector",
        breadcrumb: true,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.homePage = async function (req, res) {
    const corePlugin = req.app.pluginManager.getPlugin("core");
    const [coreSettings, coreConfig] = await Promise.all([
        corePlugin.dbService.getSettings(req.params.guildId),
        corePlugin.getConfig(),
    ]);

    const enabledPlugins = req.app.pluginManager.plugins.filter((p) =>
        coreSettings.enabled_plugins.includes(p.name),
    );

    const guild = req.session.user.guilds.find((g) => g.id === req.params.guildId);

    const [statsResp, pluginCmdsResp] = await Promise.all([
        req.app.ipcServer.broadcast("dashboard:GET_GUILD_STATS", req.params.guildId),
        req.app.ipcServer.broadcastOne("dashboard:GET_CMDS_SUMMARY"),
    ]);

    const stats = statsResp.find((r) => r.success && r.data)?.data;
    const pluginCmds = pluginCmdsResp.success ? pluginCmdsResp.data : {};
    const extendedGuild = { ...guild, ...stats };

    res.render("dashboard/home", {
        coreConfig,
        locale: req.session.locale,
        tr: req.translate,
        user: req.session.user.info,

        guild: extendedGuild,
        plugins: req.app.pluginManager.plugins,
        pluginCmds,
        enabledPlugins,

        title: `${guild.name} | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "home",
        breadcrumb: true,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.postPlugins = async function (req, res) {
    const guild = res.locals.guild;

    if (Object.prototype.hasOwnProperty.call(req.body, "plugin_enable")) {
        const plugin = req.app.pluginManager.plugins.find((p) => p.name === req.body.plugin_enable);
        if (!plugin) return res.status(404).send("Plugin not found");
        try {
            await req.app.pluginManager.enableInGuild(plugin.name, guild.id);
            const ipcResp = await req.app.ipcServer.broadcast("dashboard:UPDATE_PLUGIN", {
                pluginName: plugin.name,
                action: "guildEnable",
                guildId: guild.id,
            });
            if (ipcResp.find((r) => !r.success)) {
                await req.app.pluginManager.disableInGuild(plugin.name);
                throw new Error("Failed to enable plugin on other instances");
            }
        } catch (error) {
            console.error(error);
            return res.status(500).send(error.message);
        }
    }

    res.redirect(`/dashboard/${guild.id}`);
};
