const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");

const NekosLife = require("nekos.life");
const neko = new NekosLife();

const choices = ["hug", "kiss", "cuddle", "feed", "pat", "poke", "slap", "smug", "tickle", "wink"];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "react",
    description: "anime:REACT.DESCRIPTION",
    enabled: true,
    cooldown: 5,
    command: {
        enabled: true,
        minArgsCount: 1,
        usage: "[reaction]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "category",
                description: "anime:REACT.CATEGORY_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: choices.map((ch) => ({ name: ch, value: ch })),
            },
        ],
    },

    async messageRun(message, args) {
        const category = args[0].toLowerCase();
        if (!choices.includes(category)) {
            return message.replyT("anime:REACT.INVALID_CHOICE", {
                category,
                choices: choices.join(", "),
            });
        }

        const embed = await genReaction(message, category, message.author);
        await message.safeReply({ embeds: [embed] });
    },

    async interactionRun(interaction) {
        const choice = interaction.options.getString("category");
        const embed = await genReaction(interaction, choice, interaction.user);
        await interaction.followUp({ embeds: [embed] });
    },
};

const genReaction = async ({ guild }, category, user) => {
    try {
        let imageUrl;

        // some-random api
        if (category === "wink") {
            const response = await HttpUtils.getJson("https://some-random-api.com/animu/wink");
            if (!response.success) throw new Error("API error");
            imageUrl = response.data.link;
        }

        // neko api
        else {
            imageUrl = (await neko[category]()).url;
        }

        return new EmbedBuilder()
            .setImage(imageUrl)
            .setColor("Random")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });
    } catch (ex) {
        return EmbedUtils.error()
            .setDescription("Failed to fetch meme. Try again!")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });
    }
};
