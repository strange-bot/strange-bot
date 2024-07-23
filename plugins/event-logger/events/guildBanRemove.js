const { EmbedBuilder, AuditLogEvent } = require("discord.js");

/**
 * Log when someone gets banned
 * @param {import("discord.js").GuildBan} ban
 */
module.exports = async (ban) => {
    const guild = ban.guild;
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "BAN_REMOVE");
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
        .fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.targetId === ban.user.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.BAN_REMOVE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.BAN_REMOVE_DESC", {
                user: ban.user.toString(),
                username: ban.user.tag,
            }),
        )
        .setColor("Green")
        .addFields(
            {
                name: guild.getT("event-logger:EMBED.BAN_REASON"),
                value: auditLog.reason || guild.getT("event-logger:EMBED.BAN_REASON_DEFAULT"),
            },
            {
                name: guild.getT("event-logger:EMBED.UNBANNED_BY"),
                value: executor,
            },
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${ban.user.id}` })
        .setThumbnail(ban.user.displayAvatarURL());

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
