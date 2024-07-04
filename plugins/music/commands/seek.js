const musicValidations = require("../musicValidations");
const prettyMs = require("pretty-ms");
const { MiscUtils } = require("strange-sdk/utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "seek",
    description: "music:SEEK.DESCRIPTION",
    validations: musicValidations,
    command: {
        enabled: true,
        usage: "<duration>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "time",
                description: "music:SEEK.TIME_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const time = args.join(" ");
        const response = seekTo(message, time);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const time = interaction.options.getString("time");
        const response = seekTo(interaction, time);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {number} time
 */
function seekTo({ client, guild, guildId }, time) {
    const player = client.musicManager?.getPlayer(guildId);
    const seekTo = MiscUtils.durationToMillis(time);

    if (seekTo > player.queue.current.length) {
        return guild.getT("music:SEEK.TOO_LONG");
    }

    player.seek(seekTo);
    return guild.getT("music:SEEK.SEEKED", {
        time: prettyMs(seekTo, { colonNotation: true, secondsDecimalDigits: 0 }),
    });
}
