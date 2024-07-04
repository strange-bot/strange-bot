const { EmbedUtils } = require("strange-sdk/utils");
const { Cluster } = require("lavaclient");
const prettyMs = require("pretty-ms");
const { load, SpotifyItemType } = require("@lavaclient/spotify");
const config = require("./config");
require("@lavaclient/queue/register");

/**
 * @param {import("discord.js").Client} client
 */
module.exports = (client) => {
    load({
        client: {
            id: config.get("SPOTIFY").CLIENT_ID,
            secret: config.get("SPOTIFY").CLIENT_SECRET,
        },
        autoResolveYoutubeTracks: false,
        loaders: [
            SpotifyItemType.Album,
            SpotifyItemType.Artist,
            SpotifyItemType.Playlist,
            SpotifyItemType.Track,
        ],
    });

    const lavaclient = new Cluster({
        nodes: config.get("LAVALINK_NODES"),
        sendGatewayPayload: (id, payload) => client.guilds.cache.get(id)?.shard?.send(payload),
    });

    client.ws.on("VOICE_SERVER_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));
    client.ws.on("VOICE_STATE_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));

    lavaclient.on("nodeConnect", (node, event) => {
        client.logger.info(`Node "${node.id}" connected`);
    });

    lavaclient.on("nodeDisconnect", (node, event) => {
        client.logger.info(`Node "${node.id}" disconnected`);
    });

    lavaclient.on("nodeError", (node, error) => {
        client.logger.error(`Node "${node.id}" encountered an error: ${error.message}.`, error);
    });

    lavaclient.on("nodeDebug", (node, message) => {
        client.logger.debug(`Node "${node.id}" debug: ${message}`);
    });

    lavaclient.on("nodeTrackStart", (_node, queue, song) => {
        const fields = [];

        const embed = EmbedUtils.embed()
            .setAuthor({ name: "Now Playing" })
            .setDescription(`[${song.title}](${song.uri})`)
            .setFooter({ text: `Requested By: ${song.requester}` });

        if (song.sourceName === "youtube") {
            const identifier = song.identifier;
            const thumbnail = `https://img.youtube.com/vi/${identifier}/hqdefault.jpg`;
            embed.setThumbnail(thumbnail);
        }

        fields.push({
            name: "Song Duration",
            value: "`" + prettyMs(song.length, { colonNotation: true }) + "`",
            inline: true,
        });

        if (queue.tracks.length > 0) {
            fields.push({
                name: "Position in Queue",
                value: (queue.tracks.length + 1).toString(),
                inline: true,
            });
        }

        embed.setFields(fields);
        queue.data.channel.safeSend({ embeds: [embed] });
    });

    lavaclient.on("nodeQueueFinish", async (_node, queue) => {
        queue.data.channel.safeSend("Queue has ended.");
        await client.musicManager
            .destroyPlayer(queue.player.guildId)
            .then(queue.player.disconnect());
    });

    return lavaclient;
};
