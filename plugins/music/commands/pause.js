const musicValidations = require("../musicValidations");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "pause",
    description: "music:PAUSE.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = pause(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = pause(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function pause({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);
    if (player.paused) return guild.getT("music:PAUSE.ALREADY_PAUSED");

    player.pause(true);
    return guild.getT("music:PAUSE.PAUSED");
}
