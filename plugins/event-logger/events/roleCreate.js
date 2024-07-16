const { EmbedBuilder, AuditLogEvent } = require("discord.js");

/**
 * @param {import("discord.js").Role} role
 */
module.exports = async (role) => {
    const guild = role.guild;
    const settings = guild.getSettings("event-logger");
    const event = settings.events.find((doc) => doc.name === "ROLE_CREATE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // return if role was created by a bot (bot's role)
    if (role.managed) return;

    if (!guild.members.me.permissions.has("ViewAuditLog")) {
        return logChannel.safeSend(
            guild.getT("event-logger:MISSING_PERMISSIONS", { permission: "View Audit Log" }),
        );
    }

    const auditLog = await guild
        .fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.targetId === role.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.ROLE_CREATE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.ROLE_CREATE_DESC", { role: role.toString() }),
        )
        .setFields({
            name: guild.getT("event-logger:EMBED.CREATED_BY"),
            value: executor,
        })
        .setColor("Green")
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${role.id}}` });

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
