const musicValidations = require("../musicValidations");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "volume",
    description: "music:VOLUME.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
        usage: "<1-100>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "amount",
                description: "music:VOLUME.AMOUNT_DESC",
                type: ApplicationCommandOptionType.Integer,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const amount = args[0];
        const response = await volume(message, amount);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const amount = interaction.options.getInteger("amount");
        const response = await volume(interaction, amount);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function volume({ client, guild, guildId }, volume) {
    const player = client.musicManager.getPlayer(guildId);

    if (!volume) return guild.getT("music:VOLUME.CURRENT_VOLUME", { volume: player.volume });
    if (volume < 1 || volume > 100) return guild.getT("music:VOLUME.INVALID_VOLUME");

    await player.setVolume(volume);
    return guild.getT("music:VOLUME.VOLUME_SET", { volume });
}
