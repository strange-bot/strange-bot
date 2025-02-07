const DBClient = require("strange-db-client");
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
    const [allSettings, coreConfig] = await Promise.all([
        DBClient.getInstance().getSettings(req.params.guildId),
        req.app.pluginManager.getPlugin("core").getConfig(),
    ]);

    const enabledPlugins = Object.entries(allSettings.plugins)
        .filter(([_, value]) => value.enabled === true)
        .map(([key]) => key);

    const guild = req.session.user.guilds.find((g) => g.id === req.params.guildId);
    const responses = await req.app.ipcServer.broadcast(
        "dashboard:GET_GUILD_STATS",
        req.params.guildId,
    );
    const stats = responses.find((r) => r.success && r.data)?.data;
    const extendedGuild = { ...guild, ...stats };

    res.render("dashboard/home", {
        coreConfig,
        locale: req.session.locale,
        tr: req.translate,
        user: req.session.user.info,

        guild: extendedGuild,
        plugins: req.app.pluginManager.plugins,
        enabledPlugins,

        title: `${guild.name} | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "home",
        breadcrumb: true,
    });
};
