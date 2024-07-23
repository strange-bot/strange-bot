const { EmbedBuilder } = require("discord.js");

/**
 * Log when emoji is created
 * @param {import("discord.js").GuildEmoji} emoji
 */
module.exports = async (emoji) => {
    const guild = emoji.guild;
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "EMOJI_CREATE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const author = emoji.author || (await emoji.fetchAuthor());

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("event-logger:EMBED.EMOJI_CREATE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.EMOJI_CREATE_DESC", { emoji: emoji.toString() }),
        )
        .setColor("Green")
        .setThumbnail(emoji.imageURL())
        .addFields(
            {
                name: guild.getT("event-logger:EMBED.CREATED_BY"),
                value: `${author.toString()} [${author.id}]`,
                inline: false,
            },
            {
                name: guild.getT("event-logger:EMBED.EMOJI_NAME"),
                value: emoji.name,
                inline: true,
            },
            {
                name: guild.getT("event-logger:EMBED.EMOJI_ANIMATED"),
                value: emoji.animated ? "Yes" : "No",
                inline: true,
            },
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${emoji.id}` });

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
