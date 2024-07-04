const { parseEmoji } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { stripIndent } = require("common-tags");

module.exports = (guild, emoji) => {
    let custom = parseEmoji(emoji);
    if (!custom.id) guild.getT("information:INFO.EMOJI_NOT_VALID");

    let url = `https://cdn.discordapp.com/emojis/${custom.id}.${custom.animated ? "gif?v=1" : "png"}`;

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("information:INFO.EMOJI_EMBED_TITLE"),
        })
        .setDescription(
            stripIndent`
            **${guild.getT("information:INFO.EMOJI_ID")}:** ${custom.id}
            **${guild.getT("information:INFO.EMOJI_NAME")}:** ${custom.name}
            **${guild.getT("information:INFO.EMOJI_ANIMATED")}:** ${guild.getT(custom.animated ? "common:YES" : "common:NO")}`,
        )
        .setImage(url);

    return { embeds: [embed] };
};
