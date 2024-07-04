const musicValidations = require("../musicValidations");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "resume",
    description: "music:RESUME.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = resumePlayer(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = resumePlayer(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function resumePlayer({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);
    if (!player.paused) return guild.getT("music:RESUME.ALREADY_PLAYING");
    player.resume();
    return guild.getT("music:RESUME.RESUMED");
}
