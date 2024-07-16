const { EmbedBuilder, AuditLogEvent } = require("discord.js");

/**
 * Log when emoji is created
 * @param {import("discord.js").GuildEmoji} emoji
 */
module.exports = async (emoji) => {
    const guild = emoji.guild;
    const settings = guild.getSettings("event-logger");
    const event = settings.events.find((doc) => doc.name === "EMOJI_DELETE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    if (!guild.members.me.permissions.has("ViewAuditLog")) {
        return logChannel.safeSend(
            guild.getT("event-logger:MISSING_PERMISSIONS", { permission: "View Audit Log" }),
        );
    }

    const auditLog = await guild
        .fetchAuditLogs({ type: AuditLogEvent.EmojiDelete, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.target.id === emoji.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.CH_DELETE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.EMOJI_DELETE_DESC", { emoji: emoji.toString() }),
        )
        .setColor("Red")
        .setThumbnail(emoji.imageURL())
        .addFields(
            {
                name: guild.getT("event-logger:EMBED.DELETED_BY"),
                value: executor,
                inline: false,
            },
            {
                name: guild.getT("event-logger:EMBED.EMOJI_NAME"),
                value: emoji.name,
                inline: true,
            },
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${emoji.id}` });

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
