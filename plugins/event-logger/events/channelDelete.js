const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { channelTypes } = require("strange-sdk/utils");

/**
 * @param {import('discord.js').DMChannel | import('discord.js').GuildChannel} channel
 */
module.exports = async (channel) => {
    if (channel.isDMBased()) return;
    const guild = channel.guild;
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "CHANNEL_DELETE");
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
        .fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.target.id === channel.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;
    const channelType = channelTypes(channel.type);

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.CH_DELETE_TITLE") })
        .setDescription(guild.getT("event-logger:EMBED.CH_DELETE_DESC", { channel: channel.name }))
        .addFields(
            {
                name: guild.getT("event-logger:EMBED.CH_TYPE"),
                value: channelType,
            },
            {
                name: guild.getT("event-logger:EMBED.DELETED_BY"),
                value: executor,
            },
        )
        .setColor("Red")
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${channel.id}` });

    logChannel.safeSend({ embeds: [embed] }).catch(() => {});
};
