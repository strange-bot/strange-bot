const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { stripIndent } = require("common-tags");
const { postToBin } = require("../utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "paste",
    description: "utility:PASTE.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 2,
        usage: "<title> <content>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "title",
                description: "utility:PASTE.TITLE_DESC",
                required: true,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: "content",
                description: "utility:PASTE.CONTENT_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const title = args.shift();
        const content = args.join(" ");
        const response = await paste(message, content, title);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const title = interaction.options.getString("title");
        const content = interaction.options.getString("content");
        const response = await paste(interaction, content, title);
        await interaction.followUp(response);
    },
};

async function paste({ guild }, content, title) {
    const response = await postToBin(content, title);
    if (!response) return guild.getT("utility:PASTE.ERROR");

    const embed = new EmbedBuilder().setAuthor({ name: "utility:PASTE.EMBED_TITLE" })
        .setDescription(stripIndent`
    🔸 ${guild.getT("utility:PASTE.NORMAL")}: ${response.url}
    🔹 ${guild.getT("utility:PASTE.RAW")}: ${response.raw}
  `);

    return { embeds: [embed] };
}
