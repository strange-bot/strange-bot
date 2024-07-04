const { parseEmoji, ApplicationCommandOptionType } = require("discord.js");
const { parse } = require("twemoji-parser");
const { EmbedUtils } = require("strange-sdk/utils");

const BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/";

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "bigemoji",
    description: "utility:BIGEMOJI.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<emoji>",
        aliases: ["enlarge"],
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "emoji",
                description: "utility:BIGEMOJI.EMOJI_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const emoji = args[0];
        const response = getEmoji(message.guild, message.author, emoji);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const emoji = interaction.options.getString("emoji");
        const response = getEmoji(interaction.guild, interaction.user, emoji);
        await interaction.followUp(response);
    },
};

function getEmoji(guild, user, emoji) {
    const custom = parseEmoji(emoji);

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("utility:BIGEMOJI.EMBED_TITLE"),
        })
        .setFooter({
            text: guild.getT("common:REQUESTED_BY", { user: user.username }),
        });

    if (custom.id) {
        embed.setImage(
            `https://cdn.discordapp.com/emojis/${custom.id}.${custom.animated ? "gif" : "png"}`,
        );
        return { embeds: [embed] };
    }
    const parsed = parse(emoji, { assetType: "png" });
    if (!parsed[0]) return guild.getT("utility:BIGEMOJI.INVALID_EMOJI");

    // https://twemoji.maxcdn.com/v/latest/72x72/<id>.png  (CDN Expired)
    const resourceId = parsed[0].url.split("/").pop();
    const url = `${BASE_URL}${resourceId}`;

    embed.setImage(url);
    return { embeds: [embed] };
}
