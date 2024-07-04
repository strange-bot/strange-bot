const path = require("path");
const router = require("express").Router();
const { MiscUtils } = require("strange-sdk/utils");
const { getLatestVideo, sendAlert } = require("../utils");
const { channelId } = require("@gonetone/get-youtube-id-by-url");
const YTAlerts = require("../schemas/YTAlerts");

router.get("/", async (_req, res) => {
    const guild = res.locals.guild;
    const docs = await YTAlerts.find({ "notifications.guild_id": guild.id }).lean();
    const ytAlerts = docs.map((doc) => ({
        id: doc._id,
        channelName: doc.channel_name,
        channelUrl: `https://youtu.be/${doc._id}`,
        notification: doc.notifications.find((n) => n.guild_id === guild.id),
    }));

    res.render(path.join(__dirname, "view.ejs"), { ytAlerts });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;

    // Message
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        const settings = guild.getSettings("youtube-alerts");
        if (body.message && body.message !== settings.message) {
            settings.message = body.message;
        }

        await guild.updateSettings();
    }

    // Add Channel
    if (Object.prototype.hasOwnProperty.call(body, "add_channel")) {
        const channel = guild.channels.cache.get(body.discord_ch_id);
        let ytChannelId = body.ch_id;

        if (MiscUtils.containsLink(ytChannelId)) {
            try {
                ytChannelId = await channelId(ytChannelId);
            } catch {
                return res.status(400).send("Invalid YouTube channel URL");
            }
        }

        const doc = await YTAlerts.findById(ytChannelId);
        if (!doc) {
            const latestVideo = await getLatestVideo(ytChannelId);
            if (!latestVideo) {
                return res.status(400).send("Invalid YouTube channel ID");
            }
            await YTAlerts.create({
                _id: ytChannelId,
                channel_name: latestVideo.channelName,
                notifications: [{ guild_id: guild.id, channel_id: channel.id }],
            });
        } else {
            const exists = doc.notifications.find((n) => n.guild_id === guild.id);
            if (!exists) doc.notifications.push({ guild_id: guild.id, channel_id: channel.id });
            else exists.channel_id = channel.id;
            await doc.save();
        }
    }

    // Test Channel
    if (Object.prototype.hasOwnProperty.call(body, "test_channel")) {
        const doc = await YTAlerts.findById(body.ch_id).lean();
        if (doc) {
            const latestVideo = await getLatestVideo(doc._id);
            if (latestVideo) {
                const channel = guild.channels.cache.get(body.discord_ch_id);
                sendAlert(guild, channel, latestVideo).then(() => {});
            }
        }
    }

    // Remove Channel
    if (Object.prototype.hasOwnProperty.call(body, "remove_channel")) {
        const doc = await YTAlerts.findById(body.ch_id);
        if (doc) {
            doc.notifications = doc.notifications.filter((n) => n.guild_id !== guild.id);
            await doc.save();
        }
    }

    res.redirect("/dashboard/" + guild.id + "/youtube-alerts");
});

module.exports = router;
