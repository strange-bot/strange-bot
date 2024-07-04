const { BotUtils, EmbedUtils } = require("strange-sdk/utils");
const config = require("../config");

/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    if (!guild.available) return;

    const WEBHOOK_URL = config.get("WEBHOOK_URL");
    if (!WEBHOOK_URL) return;

    const client = guild.client;

    client.logger.info(`Guild Left: ${guild.name} Members: ${guild.memberCount}`);

    if (!client.joinLeaveWebhook) return;

    let ownerTag;
    const ownerId = guild.ownerId;
    try {
        const owner = await client.users.fetch(ownerId);
        ownerTag = owner.tag;
    } catch (err) {
        ownerTag = guild.getT("guild-logger:DELETED_USER");
    }

    const embed = EmbedUtils.embed()
        .setTitle(guild.getT("guild-logger:EMBED_TITLE"))
        .setThumbnail(guild.iconURL())
        .addFields(
            {
                name: guild.getT("guild-logger:FIELD_SERVER"),
                value: guild.name || "NA",
                inline: false,
            },
            {
                name: guild.getT("guild-logger:FIELD_ID"),
                value: guild.id,
                inline: false,
            },
            {
                name: guild.getT("guild-logger:FIELD_OWNER"),
                value: `${ownerTag} [\`${ownerId}\`]`,
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
        username: "Leave",
        avatarURL: client.user.displayAvatarURL(),
        embeds: [embed],
    });
};
