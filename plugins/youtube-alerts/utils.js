const { Logger } = require("strange-sdk/utils");
const RSSParser = require("rss-parser");
const rssParser = new RSSParser();

async function getLatestVideo(youtubeChannelId) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    try {
        const feed = await rssParser.parseURL(rssUrl);
        const latestEntry = feed.items[0];

        // TODO: null check for latestEntry
        return {
            channelName: feed.title,
            channelUrl: feed.link,
            videoId: latestEntry.id.split(":")[2], // Extract video ID from the full ID
            title: latestEntry.title,
            publishedAt: new Date(latestEntry.pubDate),
        };
    } catch (error) {
        Logger.error("Error fetching the latest video:", error);
        return null;
    }
}

async function sendAlert(guild, channel, latestVideo) {
    if (!channel.isTextBased()) return;
    const settings = guild.getSettings("youtube-alerts");
    const message = settings.message
        .replaceAll(/{channel:name}/g, latestVideo.channelName)
        .replaceAll(/{video:title}/g, latestVideo.title)
        .replaceAll(/{video:url}/g, `https://youtu.be/${latestVideo.videoId}`);

    await channel.send(message);
}

module.exports = {
    getLatestVideo,
    sendAlert,
};
