/**
 * Middleware to populate the request object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = async (req, res, next) => {
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

    const guildData = req.session.user.guilds.find((guild) => guild.id === req.params.guildId);
    res.locals.guilds = req.session.user.guilds;
    res.locals.guild = {
        ...guildData,
        getSettings: async (pluginName) => {
            return await req.app.pluginManager
                .getPlugin(pluginName)
                .dbService.getSettings(guildData.id);
        },
    };
    next();
};
