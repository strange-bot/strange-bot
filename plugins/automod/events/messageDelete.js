const { EmbedBuilder } = require("discord.js");

/**
 * This function saves stats for a new message
 * @param {import("discord.js").Message} message
 */
module.exports = async (message) => {
    if (message.partial) return;
    if (message.author.bot || !message.guild) return;

    const settings = message.guild.getSettings("automod");

    if (!settings.anti_ghostping || !settings.log_channel) return;
    const { guild } = message;
    const { members, roles, everyone } = message.mentions;

    // Check message if it contains mentions
    if (members.size > 0 || roles.size > 0 || everyone) {
        const logChannel = message.guild.channels.cache.get(settings.log_channel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: guild.getT("automod:HANDLER.PING_EMBED_TITLE") })
            .setDescription(
                `**Message:**\n${message.content}\n\n` +
                    `**Author:** ${message.author.tag} \`${message.author.id}\`\n` +
                    `**Channel:** ${message.channel.toString()}`,
            )
            .addFields(
                {
                    name: guild.getT("automod:HANDLER.PING_FIELD_MEM"),
                    value: members.size.toString(),
                    inline: true,
                },
                {
                    name: guild.getT("automod:HANDLER.PING_FIELD_ROLE"),
                    value: roles.size.toString(),
                    inline: true,
                },
                {
                    name: guild.getT("automod:HANDLER.PING_FIELD_EVERYONE"),
                    value: everyone ? "Yes" : "No",
                    inline: true,
                },
            )
            .setFooter({
                text: guild.getT("automod:HANDLER.PING_EMBED_FOOTER", {
                    time: message.createdAt.toLocaleString(),
                }),
            });

        logChannel.safeSend({ embeds: [embed] });
    }
};
