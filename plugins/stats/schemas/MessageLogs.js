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
        is_cmd: { type: Boolean, default: false },
        is_ccmd: { type: Boolean, default: false },
        cmd_name: String,
        attachments: { type: Number, default: 0 },
        embeds: { type: Number, default: 0 },
    },
    {
        versionKey: false,
        autoIndex: false,
        timestamps: {
            createdAt: "created_at",
            updatedAt: false,
        },
    },
);

const Model = mongoose.model("message-logs", Schema);

module.exports = {
    create: async (doc) => new Model(doc).save(),
};
