const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");

const animals = ["cat", "dog", "panda", "fox", "red_panda", "koala", "bird", "raccoon", "kangaroo"];
const BASE_URL = "https://some-random-api.com/animal";

/**
 * @type {import('typings').CommandType}
 */
module.exports = {
    name: "animal",
    description: "fun:ANIMAL.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<type>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "name",
                description: "fun:ANIMAL.NAME_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: animals.map((animal) => ({ name: animal, value: animal })),
            },
        ],
    },

    async messageRun(message, args) {
        const choice = args[0];
        if (!animals.includes(choice)) {
            return message.replyT("fun:ANIMAL.INVALID_ANIMAL", {
                animals: animals.join(", "),
            });
        }
        const response = await getAnimal(message.guild, message.author, choice);
        return message.safeReply(response);
    },

    async interactionRun(interaction) {
        const choice = interaction.options.getString("name");
        const response = await getAnimal(interaction.guild, interaction.user, choice);
        await interaction.followUp(response);
    },
};

async function getAnimal(guild, user, choice) {
    const response = await HttpUtils.getJson(`${BASE_URL}/${choice}`);
    if (!response.success) return guild.getT("common:API_ERROR");

    const imageUrl = response.data?.image;
    const embed = EmbedUtils.transparent()
        .setImage(imageUrl)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });

    return { embeds: [embed] };
}
