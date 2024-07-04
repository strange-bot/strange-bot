const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");

const BASE_URL = "https://some-random-api.com/lyrics";

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "lyric",
    description: "music:LYRIC.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        usage: "<Song Title - singer>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "query",
                type: ApplicationCommandOptionType.String,
                description: "music:LYRIC.QUERY_DESC",
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const choice = args.join(" ");
        if (!choice) {
            return message.replyT("music:LYRIC.MISSING_QUERY");
        }
        const response = await getLyric(message.author, message.guild, choice);
        return message.safeReply(response);
    },

    async interactionRun(interaction) {
        const choice = interaction.options.getString("query");
        const response = await getLyric(interaction.user, interaction.guild, choice);
        await interaction.followUp(response);
    },
};

async function getLyric(user, guild, choice) {
    const lyric = await HttpUtils.getJson(`${BASE_URL}?title=${choice}`);
    if (!lyric.success) return guild.getT("music:LYRIC.API_ERROR");

    const thumbnail = lyric.data?.thumbnail.genius;
    const author = lyric.data?.author;
    const lyrics = lyric.data?.lyrics;
    const title = lyric.data?.title;

    const embed = EmbedUtils.embed({
        title: `${author} - ${title}`,
        description: lyrics,
    })
        .setThumbnail(thumbnail)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });

    return { embeds: [embed] };
}
