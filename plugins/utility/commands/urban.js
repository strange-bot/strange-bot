const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");
const moment = require("moment");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "urban",
    description: "utility:URBAN.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<word>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "word",
                description: "utility:URBAN.WORD_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const word = args.join(" ");
        const response = await urban(message, word);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const word = interaction.options.getString("word");
        const response = await urban(interaction, word);
        await interaction.followUp(response);
    },
};

async function urban({ guild }, word) {
    const response = await HttpUtils.getJson(
        `http://api.urbandictionary.com/v0/define?term=${word}`,
    );
    if (!response.success) return guild.getT("common:API_ERROR");

    const json = response.data;
    if (!json.list[0]) return guild.getT("utility:URBAN.NOT_FOUND", { word });

    const data = json.list[0];
    const embed = EmbedUtils.embed()
        .setTitle(data.word)
        .setURL(data.permalink)
        .setDescription(`**Definition**\`\`\`css\n${data.definition}\`\`\``)
        .addFields(
            {
                name: guild.getT("utility:URBAN.AUTHOR"),
                value: data.author,
                inline: true,
            },
            {
                name: guild.getT("utility:URBAN.ID"),
                value: data.defid.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:URBAN.RATING"),
                value: `👍 ${data.thumbs_up} | 👎 ${data.thumbs_down}`,
                inline: true,
            },
            {
                name: guild.getT("utility:URBAN.EXAMPLE"),
                value: data.example,
                inline: false,
            },
        )
        .setFooter({
            text: guild.getT("utility:URBAN.CREATED", {
                date: moment(data.written_on).format("DD/MM/YYYY"),
            }),
        });

    return { embeds: [embed] };
}
