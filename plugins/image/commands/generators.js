const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils } = require("strange-sdk/utils");
const config = require("../config");
const { getImageFromMessage } = require("../utils");

const STRANGE_IMAGE_API = config.get("STRANGE_API_URL");

const availableGenerators = [
    "ad",
    "affect",
    "beautiful",
    "bobross",
    "challenger",
    "confusedstonk",
    "delete",
    "dexter",
    "facepalm",
    "hitler",
    "jail",
    "jokeoverhead",
    "karaba",
    "kyon-gun",
    "mms",
    "notstonk",
    "poutine",
    "rip",
    "shit",
    "stonk",
    "tattoo",
    "thomas",
    "trash",
    "wanted",
    "worthless",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "generator",
    description: "image:GEN_DESCRIPTION",
    cooldown: 1,
    botPermissions: ["EmbedLinks", "AttachFiles"],
    command: {
        enabled: true,
        aliases: availableGenerators,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "name",
                description: "image:GEN_NAME",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: availableGenerators.map((gen) => ({ name: gen, value: gen })),
            },
            {
                name: "user",
                description: "image:GEN_USER",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
            {
                name: "link",
                description: "image:GEN_LINK",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args, data) {
        const image = await getImageFromMessage(message, args);

        // use invoke as an endpoint
        const url = getGenerator(data.invoke.toLowerCase(), image);
        const response = await HttpUtils.getBuffer(url, {
            headers: {
                Authorization: `Bearer ${config.get("STRANGE_API_KEY")}`,
            },
        });

        if (!response.success) return message.replyT("image:GEN_FAIL");

        const attachment = new AttachmentBuilder(response.buffer, { name: "attachment.png" });
        const embed = new EmbedBuilder()
            .setColor(config.get("EMBED_COLOR"))
            .setImage("attachment://attachment.png")
            .setFooter({
                text: message.guild.getT("common:REQUESTED_BY", { user: message.author.username }),
            });

        await message.safeReply({ embeds: [embed], files: [attachment] });
    },

    async interactionRun(interaction) {
        const { author, guild } = interaction;

        const user = interaction.options.getUser("user");
        const imageLink = interaction.options.getString("link");
        const generator = interaction.options.getString("name");

        let image;
        if (user) image = user.displayAvatarURL({ size: 256, extension: "png" });
        if (!image && imageLink) image = imageLink;
        if (!image) image = author.displayAvatarURL({ size: 256, extension: "png" });

        const url = getGenerator(generator, image);
        const response = await HttpUtils.getBuffer(url, {
            headers: {
                Authorization: `Bearer ${config.get("STRANGE_API_KEY")}`,
            },
        });

        if (!response.success) return interaction.followUp(guild.getT("image:GEN_FAIL"));

        const attachment = new AttachmentBuilder(response.buffer, { name: "attachment.png" });
        const embed = new EmbedBuilder()
            .setColor(config.get("EMBED_COLOR"))
            .setImage("attachment://attachment.png")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

        await interaction.followUp({ embeds: [embed], files: [attachment] });
    },
};

function getGenerator(genName, image) {
    const endpoint = new URL(`${STRANGE_IMAGE_API}/generators/${genName}`);
    endpoint.searchParams.append("image", image);
    return endpoint.href;
}
