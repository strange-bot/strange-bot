const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ApplicationCommandOptionType,
    ComponentType,
} = require("discord.js");
const prettyMs = require("pretty-ms");
const { EmbedUtils } = require("strange-sdk/utils");
const config = require("../config");

const search_prefix = {
    YT: "ytsearch",
    YTM: "ytmsearch",
    SC: "scsearch",
};

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "search",
    description: "music:SEARCH.DESCRIPTION",
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
                description: "music:SEARCH.QUERY_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const query = args.join(" ");
        const response = await search(message, query);
        if (response) await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const query = interaction.options.getString("query");
        const response = await search(interaction, query);
        if (response) await interaction.followUp(response);
        else interaction.deleteReply();
    },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {string} query
 */
async function search({ member, guild, channel }, query) {
    if (!member.voice.channel) return guild.getT("music:COMMON.NOT_IN_VC");

    let player = guild.client.musicManager.getPlayer(guild.id);
    if (player && !guild.members.me.voice.channel) {
        player.disconnect();
        await guild.client.musicManager.destroyPlayer(guild.id);
    }
    if (player && member.voice.channel !== guild.members.me.voice.channel) {
        return guild.getT("music:COMMON.NOT_SAME_VC");
    }

    let res;
    try {
        res = await guild.client.musicManager.rest.loadTracks(
            /^https?:\/\//.test(query)
                ? query
                : `${search_prefix[config.get("DEFAULT_SOURCE")]}:${query}`,
        );
    } catch (err) {
        return guild.getT("music:SEARCH.SEARCH_ERROR");
    }

    let embed = EmbedUtils.embed();
    let tracks;

    const loadType = res.tracks.length > 0 ? res.loadType : "NO_MATCHES";
    switch (loadType) {
        case "LOAD_FAILED":
            guild.client.logger.error("Search Exception", res.exception);
            return guild.getT("music:SEARCH.SEARCH_ERROR");

        case "NO_MATCHES":
            return guild.getT("music:SEARCH.NO_MATCHES", { query });

        case "TRACK_LOADED": {
            const [track] = res.tracks;
            tracks = [track];
            if (!player?.playing && !player?.paused && !player?.queue.tracks.length) {
                embed.setAuthor({ name: guild.getT("music:SEARCH.QUEUE_TRACK_ADD") });
                break;
            }

            const fields = [];
            embed
                .setAuthor({ name: guild.getT("music:SEARCH.QUEUE_TRACK_ADD") })
                .setDescription(`[${track.info.title}](${track.info.uri})`)
                .setFooter({
                    text: guild.getT("common:REQUESTED_BY", { user: member.user.username }),
                });

            fields.push({
                name: guild.getT("music:SEARCH.TRACK_DURATION"),
                value: "`" + prettyMs(track.info.length, { colonNotation: true }) + "`",
                inline: true,
            });

            // if (typeof track.displayThumbnail === "function") embed.setThumbnail(track.displayThumbnail("hqdefault"));
            if (player?.queue?.tracks?.length > 0) {
                fields.push({
                    name: guild.getT("music:SEARCH.QUEUE_POS"),
                    value: (player.queue.tracks.length + 1).toString(),
                    inline: true,
                });
            }
            embed.addFields(fields);
            break;
        }

        case "PLAYLIST_LOADED":
            tracks = res.tracks;
            embed
                .setAuthor({ name: "Added Playlist to queue" })
                .setDescription(res.playlistInfo.name)
                .addFields(
                    {
                        name: guild.getT("music:SEARCH.PLAYLIST_TRACKS"),
                        value: `${res.tracks.length} songs`,
                        inline: true,
                    },
                    {
                        name: guild.getT("music:SEARCH.PLAYLIST_DUR"),
                        value:
                            "`" +
                            prettyMs(
                                res.tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
                                { colonNotation: true },
                            ) +
                            "`",
                        inline: true,
                    },
                )
                .setFooter({
                    text: guild.getT("common:REQUESTED_BY", { user: member.user.username }),
                });
            break;

        case "SEARCH_RESULT": {
            let max = config.get("MAX_SEARCH_RESULTS");
            if (res.tracks.length < max) max = res.tracks.length;

            const results = res.tracks.slice(0, max);
            const options = results.map((result, index) => ({
                label: result.info.title,
                value: index.toString(),
            }));

            const menuRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("search-results")
                    .setPlaceholder(guild.getT("music:SEARCH.PLACEHOLDER"))
                    .setMaxValues(max)
                    .addOptions(options),
            );

            const tempEmbed = EmbedUtils.embed()
                .setAuthor({ name: guild.getT("music:SEARCH.SEARCH_RESULTS") })
                .setDescription(guild.getT("music:SEARCH.SEARCH_RESULTS_DESC"));

            const sentMsg = await channel.send({
                embeds: [tempEmbed],
                components: [menuRow],
            });

            try {
                const response = await channel.awaitMessageComponent({
                    filter: (reactor) =>
                        reactor.message.id === sentMsg.id && reactor.user.id === member.id,
                    idle: 30 * 1000,
                    componentType: ComponentType.StringSelect,
                });

                await sentMsg.delete();
                if (!response) return guild.getT("common:COLLECT_TIMEOUT");

                if (response.customId !== "search-results") return;
                const toAdd = [];
                response.values.forEach((v) => toAdd.push(results[v]));

                // Only 1 song is selected
                if (toAdd.length === 1) {
                    tracks = [toAdd[0]];
                    embed.setAuthor({ name: guild.getT("music:SEARCH.QUEUE_TRACK_ADD") });
                } else {
                    tracks = toAdd;
                    embed
                        .setDescription(
                            guild.getT("music:SEARCH.SEARCH_ADDED", { count: toAdd.length }),
                        )
                        .setFooter({ text: guild.getT("common:REQUESTED_BY") });
                }
            } catch (err) {
                guild.client.logger.error("Search Error", err);
                await sentMsg.delete();
                return guild.getT("common:COLLECT_TIMEOUT");
            }
        }
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
