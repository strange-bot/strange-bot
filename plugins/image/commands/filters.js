const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils } = require("strange-sdk/utils");
const { getImageFromMessage } = require("../utils");
const config = require("../config");

const STRANGE_IMAGE_API = config.get("STRANGE_API_URL");

const availableFilters = [
    "blur",
    "brighten",
    "burn",
    "darken",
    "distort",
    "greyscale",
    "invert",
    "pixelate",
    "sepia",
    "sharpen",
    "threshold",
];

const additionalParams = {
    brighten: {
        params: [{ name: "amount", value: "100" }],
    },
    darken: {
        params: [{ name: "amount", value: "100" }],
    },
    distort: {
        params: [{ name: "level", value: "10" }],
    },
    pixelate: {
        params: [{ name: "pixels", value: "10" }],
    },
    sharpen: {
        params: [{ name: "level", value: "5" }],
    },
    threshold: {
        params: [{ name: "amount", value: "100" }],
    },
};

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "filter",
    description: "image:FILTER_DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks", "AttachFiles"],
    command: {
        enabled: true,
        aliases: availableFilters,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "name",
                description: "image:FILTER_NAME",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: availableFilters.map((filter) => ({ name: filter, value: filter })),
            },
            {
                name: "user",
                description: "image:FILTER_USER",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
            {
                name: "link",
                description: "image:FILTER_LINK",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args, data) {
        const image = await getImageFromMessage(message, args);

        // use invoke as an endpoint
        const url = getFilter(data.invoke.toLowerCase(), image);
        const response = await HttpUtils.getBuffer(url, {
            headers: {
                Authorization: `Bearer ${config.get("STRANGE_API_KEY")}`,
            },
        });

        if (!response.success) return message.replyT("image:FILTER_FAIL");

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
        const filter = interaction.options.getString("name");

        let image;
        if (user) image = user.displayAvatarURL({ size: 256, extension: "png" });
        if (!image && imageLink) image = imageLink;
        if (!image) image = author.displayAvatarURL({ size: 256, extension: "png" });

        const url = getFilter(filter, image);
        const response = await HttpUtils.getBuffer(url, {
            headers: {
                Authorization: `Bearer ${config.get("STRANGE_API_KEY")}`,
            },
        });

        if (!response.success) return interaction.followUp(guild.getT("image:FILTER_FAIL"));

        const attachment = new AttachmentBuilder(response.buffer, { name: "attachment.png" });
        const embed = new EmbedBuilder()
            .setColor(config.get("EMBED_COLOR"))
            .setImage("attachment://attachment.png")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

        await interaction.followUp({ embeds: [embed], files: [attachment] });
    },
};

function getFilter(filter, image) {
    const endpoint = new URL(`${STRANGE_IMAGE_API}/filters/${filter}`);
    endpoint.searchParams.append("image", image);

    // add additional params if any
    if (additionalParams[filter]) {
        additionalParams[filter].params.forEach((param) => {
            endpoint.searchParams.append(param.name, param.value);
        });
    }

    return endpoint.href;
}
