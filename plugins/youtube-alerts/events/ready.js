const { getLatestVideo, sendAlert } = require("../utils");
const YTAlerts = require("../schemas/YTAlerts");
const config = require("../config");

/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    setInterval(() => checkForNewVideos(client), config.get("POLL_INTERVAL"));
    checkForNewVideos(client);
};

/**
 * @param {import('discord.js').Client} client
 */
async function checkForNewVideos(client) {
    const ytAlerts = await YTAlerts.find();
    const now = new Date();

    for (const alert of ytAlerts) {
        const latestVideo = await getLatestVideo(alert.id);
        if (!latestVideo) continue;

        const timeSincePublished = now - latestVideo.publishedAt;
        if (
            latestVideo.videoId !== alert.latest_video_id &&
            timeSincePublished <= config.get("NOTIFICATION_THRESHOLD")
        ) {
            client.logger.debug(`New video uploaded to channel`, latestVideo);
            alert.latest_video_id = latestVideo.videoId;
            await alert.save();

            // Send notifications to all associated Discord channels
            for (const notification of alert.notifications) {
                const guild = client.guilds.cache.get(notification.guild_id);
                if (!guild) continue;
                const discordChannel = await client.channels.fetch(notification.channel_id);
                sendAlert(guild, discordChannel, latestVideo).then(() => {});
            }
        }
    }
}
