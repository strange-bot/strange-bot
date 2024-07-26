const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils } = require("strange-sdk/utils");
const config = require("../config");
const { getImageFromMessage } = require("../utils");
const { StrangeGenerators } = require("strange.js");

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

        try {
            // use invoke as the generator name
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
            message.client.logger.error("Error generating a generator", ex);
            return message.replyT("image:GEN_FAIL");
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
            interaction.client.logger.error("Error generating a generator", ex);
            return interaction.followUp(guild.getT("image:GEN_FAIL"));
        };
    },
};

async function getResult(genName, image) {
    const generators = new StrangeGenerators(config.get("STRANGE_API_KEY"));
    switch (genName) {
        case "ad":
            return await generators.ad(image);

        case "affect":
            return await generators.affect(image);

        case "beautiful":
            return await generators.beautiful(image);

        case "bobross":
            return await generators.bobross(image);

        case "challenger":
            return await generators.challenger(image);

        case "confusedstonk":
            return await generators.confusedstonk(image);

        case "delete":
            return await generators.delete(image);

        case "dexter":
            return await generators.dexter(image);

        case "facepalm":
            return await generators.facepalm(image);

        case "hitler":
            return await generators.hitler(image);

        case "jail":
            return await generators.jail(image);

        case "jokeoverhead":
            return await generators.jokeoverhead(image);

        case "karaba":
            return await generators.karaba(image);

        case "kyon-gun":
            return await generators.kyonGun(image);

        case "mms":
            return await generators.mms(image);

        case "notstonk":
            return await generators.notstonk(image);

        case "poutine":
            return await generators.poutine(image); 

        case "rip":
            return await generators.rip(image);

        case "shit":
            return await generators.shit(image);

        case "stonk":
            return await generators.stonk(image);

        case "tattoo":
            return await generators.tattoo(image);

        case "thomas":
            return await generators.thomas(image);

        case "trash":
            return await generators.trash(image);

        case "wanted":
            return await generators.wanted(image);

        case "worthless":
            return await generators.worthless(image);
            
        default:
                throw new Error("Invalid generator");
    }   
}
