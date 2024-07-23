const { EmbedBuilder } = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");

/**
 * @param {import('discord.js').Invite} invite
 */
module.exports = async (invite) => {
    const guild = invite.guild;
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "INVITE_CREATE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.INVITE_CREATE_TITLE") })
        .setColor("Green")
        .setDescription(
            guild.getT("event-logger:EMBED.INVITE_CREATE_DESC", {
                code: invite.code,
                channel: invite.channel.toString(),
            }),
        )
        .addFields(
            {
                name: guild.getT("event-logger:EMBED.CREATED_BY"),
                value: `${invite.inviter.toString()} [${invite.inviter.id}]`,
                inline: false,
            },
            {
                name: guild.getT("event-logger:EMBED.INVITE_EXPIRES"),
                value:
                    invite.maxAge === 0
                        ? guild.getT("event-logger:EMBED.INVITE_EXPIRES_NEVER")
                        : MiscUtils.timeformat(invite.maxAge),
                inline: true,
            },
            {
                name: guild.getT("event-logger:EMBED.INVITE_USES"),
                value: `${invite.maxUses || guild.getT("event-logger:EMBED.INVITE_USES_UNLIMITED")}`,
                inline: true,
            },
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${invite.code}` });

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
