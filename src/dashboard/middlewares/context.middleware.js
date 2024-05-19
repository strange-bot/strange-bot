const { PermissionsBitField } = require("discord.js");
const DBModel = require("../../schemas/Dashboard");

/**
 * @param {import('discord.js').Client} client
 */
module.exports = (client) => {
    /**
     * Middleware to populate the request object with the user's context
     * @param {import('express').Request} req
     * @param {import('express').Response} _res
     * @param {import('express').NextFunction} next
     */
    return async (req, _res, next) => {
        if (req.session.user && req.url !== "/") {
            // Populate user guild data
            req.session.user.guilds.forEach((guild) => {
                if (guild.owner) guild.admin = true;
                if (guild.permissions) {
                    const perms = new PermissionsBitField(BigInt(guild.permissions));
                    if (perms.has("ManageGuild")) guild.admin = true;
                }
                guild.settingsUrl = client.guilds.cache.get(guild.id)
                    ? `/dashboard/${guild.id}`
                    : client.getInvite() + `&guild_id=${guild.id}`;
                guild.iconURL = guild.icon
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
                    : "https://discordemoji.com/assets/emoji/discordcry.png";
            });

            // Populate user data
            const user = await client.users.fetch(req.session.user.infos.id);
            user.email = req.session.user.infos.email;
            req.user = {
                infos: user,
                guilds: req.session.user.guilds,
            };

            if (!req.session.locale) {
                const user = await DBModel.get(req.session.user.infos.id);
                req.session.locale = user.locale;
                req.session.save((err) => {
                    if (err) client.logger.error("Failed to save session", err);
                });
            }
        }

        req.locale = req.session.locale;
        req.client = client;
        req.translate = req.client.translations.get(req.locale);
        next();
    };
};
