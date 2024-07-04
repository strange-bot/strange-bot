const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const prettyMs = require("pretty-ms");
const config = require("../config");
const { SpotifyItemType } = require("@lavaclient/spotify");

const search_prefix = {
    YT: "ytsearch",
    YTM: "ytmsearch",
    SC: "scsearch",
};

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "play",
    description: "music:PLAY.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<song-name>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "query",
                description: "music:PLAY.QUERY_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const query = args.join(" ");
        const response = await play(message, query);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const query = interaction.options.getString("query");
        const response = await play(interaction, query);
        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {string} query
 */
async function play({ member, guild, channel }, query) {
    if (!member.voice.channel) return guild.getT("music:COMMON.NOT_IN_VC");

    let player = guild.client.musicManager.getPlayer(guild.id);
    if (player && !guild.members.me.voice.channel) {
        player.disconnect();
        await guild.client.musicManager.destroyPlayer(guild.id);
    }

    if (player && member.voice.channel !== guild.members.me.voice.channel) {
        return guild.getT("music:COMMON.NOT_SAME_VC");
    }

    let embed = EmbedUtils.embed();
    let tracks;
    let description = "";

    try {
        if (guild.client.musicManager.spotify.isSpotifyUrl(query)) {
            if (!config.get("SPOTIFY").CLIENT_ID || !config.get("SPOTIFY").CLIENT_SECRET) {
                return guild.getT("music:PLAY.SPOTIFY_DISABLED");
            }

            const item = await guild.client.musicManager.spotify.load(query);
            switch (item?.type) {
                case SpotifyItemType.Track: {
                    const track = await item.resolveYoutubeTrack();
                    tracks = [track];
                    description = `[${track.info.title}](${track.info.uri})`;
                    break;
                }

                case SpotifyItemType.Artist:
                    tracks = await item.resolveYoutubeTracks();
                    description = `Artist: [**${item.name}**](${query})`;
                    break;

                case SpotifyItemType.Album:
                    tracks = await item.resolveYoutubeTracks();
                    description = `Album: [**${item.name}**](${query})`;
                    break;

                case SpotifyItemType.Playlist:
                    tracks = await item.resolveYoutubeTracks();
                    description = `Playlist: [**${item.name}**](${query})`;
                    break;

                default:
                    return guild.getT("music:PLAY.SEARCH_ERROR");
            }

            if (!tracks) guild.client.logger.debug({ query, item });
        } else {
            const res = await guild.client.musicManager.rest.loadTracks(
                /^https?:\/\//.test(query)
                    ? query
                    : `${search_prefix[config.get("DEFAULT_SOURCE")]}:${query}`,
            );
            switch (res.loadType) {
                case "LOAD_FAILED":
                    guild.client.logger.error("Search Exception", res.exception);
                    return guild.getT("music:PLAY.SEARCH_ERROR");

                case "NO_MATCHES":
                    return guild.getT("music:PLAY.NO_MATCHES");

                case "PLAYLIST_LOADED":
                    tracks = res.tracks;
                    description = res.playlistInfo.name;
                    break;

                case "TRACK_LOADED":
                case "SEARCH_RESULT": {
                    const [track] = res.tracks;
                    tracks = [track];
                    break;
                }

                default:
                    guild.client.logger.debug("Unknown loadType", res);
                    return "🚫 An error occurred while searching for the song";
            }

            if (!tracks) guild.client.logger.debug({ query, res });
        }
    } catch (error) {
        guild.client.logger.error(
            "Search Exception",
            typeof error === "object" ? JSON.stringify(error) : error,
        );
        return guild.getT("music:PLAY.SEARCH_ERROR");
    }

    if (!tracks) return guild.getT("music:PLAY.SEARCH_ERROR");

    if (tracks.length === 1) {
        const track = tracks[0];
        if (!player?.playing && !player?.paused && !player?.queue.tracks.length) {
            embed.setAuthor({ name: guild.getT("music:PLAY.QUEUE_TRACK_ADD") });
        } else {
            const fields = [];
            embed
                .setAuthor({ name: guild.getT("music:PLAY.QUEUE_TRACK_ADD") })
                .setDescription(`[${track.info.title}](${track.info.uri})`)
                .setFooter({ text: `Requested By: ${member.user.username}` });

            fields.push({
                name: guild.getT("music:PLAY.SONG_DUR"),
                value: "`" + prettyMs(track.info.length, { colonNotation: true }) + "`",
                inline: true,
            });

            if (player?.queue?.tracks?.length > 0) {
                fields.push({
                    name: guild.getT("music:PLAY.QUEUE_POS"),
                    value: (player.queue.tracks.length + 1).toString(),
                    inline: true,
                });
            }
            embed.addFields(fields);
        }
    } else {
        embed
            .setAuthor({ name: guild.getT("music:PLAY.QUEUE_PLAYLIST_ADD") })
            .setDescription(description)
            .addFields(
                {
                    name: guild.getT("music:PLAY.PLAYLIST_SONGS"),
                    value: `${tracks.length} songs`,
                    inline: true,
                },
                {
                    name: guild.getT("music:PLAY.PLAYLIST_DUR"),
                    value:
                        "`" +
                        prettyMs(
                            tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
                            { colonNotation: true },
                        ) +
                        "`",
                    inline: true,
                },
            )
            .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: member.user.username }) });
    }

    // create a player and/or join the member's vc
    if (!player?.connected) {
        player = guild.client.musicManager.createPlayer(guild.id);
        player.queue.data.channel = channel;
        player.connect(member.voice.channel.id, { deafened: true });
    }

    // do queue things
    const started = player.playing || player.paused;
    player.queue.add(tracks, { requester: member.user.username, next: false });
    if (!started) {
        await player.queue.start();
    }

    return { embeds: [embed] };
}
