const { BotUtils, EmbedUtils } = require("strange-sdk/utils");
const config = require("../config");

/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    if (!guild.available) return;

    const WEBHOOK_URL = config.get("WEBHOOK_URL");
    if (!WEBHOOK_URL) return;

    if (!guild.members.cache.has(guild.ownerId)) {
        await guild.fetchOwner({ cache: true }).catch(() => {});
    }

    const client = guild.client;

    client.logger.info(`Guild Joined: ${guild.name} Members: ${guild.memberCount}`);
    const embed = EmbedUtils.embed()
        .setTitle(guild.getT("guild-logger:EMBED_TITLE"))
        .setThumbnail(guild.iconURL())
        .addFields(
            {
                name: guild.getT("guild-logger:FIELD_SERVER"),
                value: guild.name,
                inline: false,
            },
            {
                name: guild.getT("guild-logger:FIELD_ID"),
                value: guild.id,
                inline: false,
            },
            {
                name: guild.getT("guild-logger:FIELD_OWNER"),
                value: `${client.users.cache.get(guild.ownerId).tag} [\`${guild.ownerId}\`]`,
                inline: false,
            },
            {
                name: guild.getT("guild-logger:FIELD_MEMBERS"),
                value: `\`\`\`yaml\n${guild.memberCount}\`\`\``,
                inline: false,
            },
        )
        .setFooter({
            text: guild.getT("guild-logger:EMBED_FOOTER", {
                guilds: client.guilds.cache.size,
            }),
        });

    BotUtils.sendWebhookMessage(WEBHOOK_URL, {
        username: "Join",
        avatarURL: client.user.displayAvatarURL(),
        embeds: [embed],
    });
};
