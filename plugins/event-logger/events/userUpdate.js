const { EmbedBuilder } = require("discord.js");

/**
 * @param {import("discord.js").User} oldUser
 * @param {import("discord.js").User} newUser
 */
module.exports = async (oldUser, newUser) => {
    if (newUser.bot) return;
    if (oldUser.partial) return;

    const guilds = newUser.client.guilds.cache.values();
    const commonGuilds = [];
    for (const g of guilds) {
        // Check member
        const member = await g.members.fetch(newUser.id).catch(() => null);
        if (member) commonGuilds.push(g);
    }

    for (const guild of commonGuilds) {
        const settings = guild.getSettings("event-logger");
        if (!settings.enabled) return;
        const event = settings.events.find((doc) => doc.name === "USER_UPDATE");
        const logChannelId = event?.log_channel || settings.log_channel;

        if (!event?.enabled || !logChannelId) continue;
        const logChannel = guild.channels.cache.get(logChannelId);
        if (!logChannel) continue;

        const embed = new EmbedBuilder()
            .setAuthor({ name: guild.getT("event-logger:EMBED.USER_UPDATE_TITLE") })
            .setColor("Green")
            .setThumbnail(newUser.displayAvatarURL())
            .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${newUser.id}` });

        const fields = [];

        // Avatar
        if (oldUser.avatar !== newUser.avatar) {
            fields.push({
                name: guild.getT("event-logger:EMBED.USER_AVATAR"),
                value: `[Old](${oldUser.displayAvatarURL()}) -> [New](${newUser.displayAvatarURL()})`,
            });
        }

        // Username
        if (oldUser.username !== oldUser.username) {
            fields.push({
                name: guild.getT("event-logger:EMBED.USER_USERNAME"),
                value: `\`${oldUser.username}\` -> \`${newUser.username}\``,
            });
        }

        // Global name
        if (oldUser.globalName !== newUser.globalName) {
            fields.push({
                name: guild.getT("event-logger:EMBED.USER_GLOBAL_NAME"),
                value: `\`${oldUser.globalName || "none"}\` -> \`${newUser.globalName || "none"}\``,
            });
        }

        if (fields.length) embed.setFields(fields);
        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};
