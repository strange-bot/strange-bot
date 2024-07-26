const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { getImageFromMessage } = require("../utils");
const { StrangeFilters } = require("strange.js");
const config = require("../config");

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

        try {
             // use invoke as an endpoint
            const result = getResult(data.invoke.toLowerCase(), image);

            const attachment = new AttachmentBuilder(result, { name: "attachment.png" });
            const embed = new EmbedBuilder()
                .setColor(config.get("EMBED_COLOR"))
                .setImage("attachment://attachment.png")
                .setFooter({
                    text: message.guild.getT("common:REQUESTED_BY", { user: message.author.username }),
                });

            await message.safeReply({ embeds: [embed], files: [attachment] });
        } catch(ex) {
            message.client.logger.error("Error generating a filter", ex);
            return message.replyT("image:FILTER_FAIL");
        }
    },

    async interactionRun(interaction) {
        const { user, guild } = interaction;

        const optUser = interaction.options.getUser("user");
        const imageLink = interaction.options.getString("link");
        const filter = interaction.options.getString("name");

        const image = optUser 
        ? // if user is provided, use their avatar
        optUser.displayAvatarURL({ size: 256, extension: "png" }) 
        : // if no user is provided, use the provided image, or the interaction author's avatar
        (imageLink ? imageLink : user.displayAvatarURL({ size: 256, extension: "png" }));

        try {
            const result = await getResult(filter, image);
            const attachment = new AttachmentBuilder(result, { name: "attachment.png" });

            const embed = new EmbedBuilder()
            .setColor(config.get("EMBED_COLOR"))
            .setImage("attachment://attachment.png")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });

            await interaction.followUp({ embeds: [embed], files: [attachment] });
            
        } catch(ex) {
            interaction.client.logger.error("Error generating a filter", ex);
            return interaction.followUp(guild.getT("image:FILTER_FAIL"));
        }
    },
};

async function getResult(filter, image) {
    const filters = new StrangeFilters(config.get("STRANGE_API_KEY"));

    switch (filter) {
        case "blur":
            return await filters.blur(image);

        case "brighten":
            return await filters.brighten(image, 100);

        case "burn":
            return await filters.burn(image, 100);

        case "darken":
            return await filters.darken(image);

        case "distort":
            return await filters.distort(image, 10);

        case "greyscale":
            return await filters.greyscale(image);

        case "invert":
            return await filters.invert(image);

        case "pixelate":
            return await filters.pixelate(image, 10);

        case "sepia":
            return await filters.sepia(image);

        case "sharpen":
            return await filters.sharpen(image, 5);

        case "threshold":
            return await filters.threshold(image, 100);
        
        default:
            throw new Error("Invalid filter");
    }
}
