const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    _id: false,
    guild_id: String,
    channel_id: String,
});

const channelSchema = new mongoose.Schema({
    _id: String,
    channel_name: String,
    latest_video_id: String,
    notifications: [notificationSchema],
});

const Channel = mongoose.model("yt-alerts", channelSchema);

module.exports = Channel;
