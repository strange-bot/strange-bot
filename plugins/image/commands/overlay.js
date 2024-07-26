const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const config = require("../config");
const { getImageFromMessage } = require("../utils");
const { StrangeOverlays } = require("strange.js");

const availableOverlays = [
    "approved",
    "brazzers",
    "gay",
    "halloween",
    "rejected",
    "thuglife",
    "to-be-continued",
    "wasted",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "overlay",
    description: "image:OVERLAY_DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks", "AttachFiles"],
    command: {
        enabled: true,
        aliases: availableOverlays,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "name",
                description: "image:OVERLAY_NAME",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: availableOverlays.map((overlay) => ({ name: overlay, value: overlay })),
            },
            {
                name: "user",
                description: "image:OVERLAY_USER",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
            {
                name: "link",
                description: "image:OVERLAY_LINK",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args, data) {
        const image = await getImageFromMessage(message, args);

        try {
            const response = await getResult(data.invoke.toLowerCase(), image);
            const attachment = new AttachmentBuilder(response, { name: "attachment.png" });

            const embed = new EmbedBuilder()
                .setColor(config.get("EMBED_COLOR"))
                .setImage("attachment://attachment.png")
                .setFooter({
                    text: message.guild.getT("common:REQUESTED_BY", { user: message.author.username }),
                });

            await message.safeReply({ embeds: [embed], files: [attachment] });

        } catch(ex) {
            message.client.logger.error("Error generating overlay", ex);
            return message.replyT("image:OVERLAY_FAIL");
        }
    },

    async interactionRun(interaction) {
        const { user, guild } = interaction;

        const optUser = interaction.options.getUser("user");
        const imageLink = interaction.options.getString("link");
        const generator = interaction.options.getString("name");

        const image = optUser 
        ? // if user is provided, use their avatar
        optUser.displayAvatarURL({ size: 256, extension: "png" }) 
        : // if no user is provided, use the provided image, or the interaction author's avatar
        (imageLink ? imageLink : user.displayAvatarURL({ size: 256, extension: "png" }));

        try {
            const response = await getResult(generator, image);

            const attachment = new AttachmentBuilder(response, { name: "attachment.png" });
            
            const embed = new EmbedBuilder()
            .setColor(config.get("EMBED_COLOR"))
            .setImage("attachment://attachment.png")
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: user.username }) });

        await interaction.followUp({ embeds: [embed], files: [attachment] });

        } catch(ex) {
            interaction.client.logger.error("Error generating a filter", ex);
            return interaction.followUp(guild.getT("image:OVERLAY_FAIL"));
        };
    }
};

/**
 * 
 * @param {string} filter 
 * @param {string} image 
 * @returns {Promise<Buffer>}
 */
async function getResult(filter, image) {
    const overlays = new StrangeOverlays(config.get("STRANGE_API_KEY"));

    switch (filter) {
        case "approved":
            return await overlays.approve(image);

        case "brazzers":
            return await overlays.brazzers(image);

        case "gay":
            return await overlays.gay(image);

        case "halloween":
            return await overlays.halloween(image);

        case "rejected":
            return await overlays.rejected(image);

        case "thuglife":
            return await overlays.thugLife(image);

        case "to-be-continued":
            return await overlays.toBeContinued(image);

        case "wasted":
            return await overlays.wasted(image);

        default:
            throw new Error("Invalid overlay");
    }
}
