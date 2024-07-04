const musicValidations = require("../musicValidations");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "shuffle",
    description: "music:SHUFFLE.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = shuffle(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = shuffle(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function shuffle({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);
    player.queue.shuffle();
    return guild.getT("music:SHUFFLE.SHUFFLED");
}
