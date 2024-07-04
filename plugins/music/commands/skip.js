const musicValidations = require("../musicValidations");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "skip",
    description: "music:SKIP.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
        aliases: ["next"],
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = skip(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = skip(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function skip({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);

    // check if current song is playing
    if (!player.queue.current) return guild.getT("music:SKIP.NOTHING_TO_SKIP");

    const { title } = player.queue.current;
    return player.queue.next()
        ? guild.getT("music:SKIP.SKIPPED", { title })
        : guild.getT("music:SKIP.NOTHING_TO_SKIP");
}
