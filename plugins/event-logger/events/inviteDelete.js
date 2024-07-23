const { EmbedBuilder, AuditLogEvent } = require("discord.js");

/**
 * @param {import('discord.js').Invite} invite
 */
module.exports = async (invite) => {
    const guild = invite.client.guilds.cache.get(invite.guild.id);
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "INVITE_DELETE");
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
        .fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.target.code === invite.code
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.INVITE_DELETE_TITLE") })
        .setColor("Red")
        .setDescription(
            guild.getT("event-logger:EMBED.INVITE_DELETE_DESC", {
                code: invite.code,
                channel: invite.channel.toString(),
            }),
        )
        .addFields({
            name: guild.getT("event-logger:EMBED.DELETED_BY"),
            value: executor,
        })
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${invite.code}` });

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
