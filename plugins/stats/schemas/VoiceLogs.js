const mongoose = require("mongoose");

const ReqString = {
    type: String,
    required: true,
};

const Schema = new mongoose.Schema(
    {
        guild_id: ReqString,
        channel_id: ReqString,
        member_id: ReqString,
        connected_at: Number,
        disconnected_at: Number,
        connection_time: Number,
    },
    {
        versionKey: false,
        autoIndex: false,
        timestamps: false,
    },
);

const Model = mongoose.model("voice-logs", Schema);

module.exports = {
    create: async (doc) => new Model(doc).save(),
};
