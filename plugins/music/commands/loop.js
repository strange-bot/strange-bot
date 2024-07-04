const musicValidations = require("../musicValidations");
const { LoopType } = require("@lavaclient/queue");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "loop",
    description: "music:LOOP.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
        minArgsCount: 1,
        usage: "<queue|track>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "type",
                type: ApplicationCommandOptionType.String,
                description: "music:LOOP.TYPE_DESC",
                required: false,
                choices: [
                    {
                        name: "queue",
                        value: "queue",
                    },
                    {
                        name: "track",
                        value: "track",
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0].toLowerCase();
        const type = input === "queue" ? "queue" : "track";
        const response = toggleLoop(message, type);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const type = interaction.options.getString("type") || "track";
        const response = toggleLoop(interaction, type);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {"queue"|"track"} type
 */
function toggleLoop({ client, guild, guildId }, type) {
    const player = client.musicManager.getPlayer(guildId);

    // track
    if (type === "track") {
        player.queue.setLoop(LoopType.Song);
        return guild.getT("music:LOOP.TRACK_LOOP");
    }

    // queue
    else if (type === "queue") {
        player.queue.setLoop(1);
        return player.queueRepeat
            ? guild.getT("music:LOOP.QUEUE_LOOP_ENABLED")
            : guild.getT("music:LOOP.QUEUE_LOOP_DISABLED");
    }
}
