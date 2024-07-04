const { EmbedUtils } = require("strange-sdk/utils");
const prettyMs = require("pretty-ms");
const { splitBar } = require("string-progressbar");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "np",
    description: "music:NP.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        aliases: ["nowplaying"],
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = nowPlaying(message);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = nowPlaying(interaction);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function nowPlaying({ client, guild, guildId }) {
    const player = client.musicManager.getPlayer(guildId);
    if (!player || !player.queue.current) return guild.getT("music:COMMON.NO_MUSIC");

    const track = player.queue.current;
    const end =
        track.length > 6.048e8 ? "🔴 LIVE" : new Date(track.length).toISOString().slice(11, 19);

    const embed = EmbedUtils.embed()
        .setAuthor({ name: "Now playing" })
        .setDescription(`[${track.title}](${track.uri})`)
        .addFields(
            {
                name: guild.getT("music:NP.DURATION"),
                value: "`" + prettyMs(track.length, { colonNotation: true }) + "`",
                inline: true,
            },
            {
                name: guild.getT("music:NP.REQUESTED_BY"),
                value: track.requester || "Unknown",
                inline: true,
            },
            {
                name: "\u200b",
                value:
                    new Date(player.position).toISOString().slice(11, 19) +
                    " [" +
                    splitBar(
                        track.length > 6.048e8 ? player.position : track.length,
                        player.position,
                        15,
                    )[0] +
                    "] " +
                    end,
                inline: false,
            },
        );

    return { embeds: [embed] };
}
