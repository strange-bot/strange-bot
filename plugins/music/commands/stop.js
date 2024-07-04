const musicValidations = require("../musicValidations");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "stop",
    description: "music:STOP.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
        aliases: ["leave"],
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = await stop(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = await stop(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function stop({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);
    player.disconnect();
    await client.musicManager.destroyPlayer(guildId);
    return guild.getT("music:STOP.STOPPED");
}
