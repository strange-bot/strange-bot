const mongoose = require("mongoose");

const ReqString = {
    type: String,
    required: true,
};

const DefaultBoolean = {
    type: Boolean,
    default: false,
};

const Schema = new mongoose.Schema(
    {
        guild_id: ReqString,
        channel_id: ReqString,
        member_id: ReqString,
        is_slash: DefaultBoolean,
        is_user_context: DefaultBoolean,
        is_message_context: DefaultBoolean,
        cmd_name: String,
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

const Model = mongoose.model("interaction-logs", Schema);

module.exports = {
    create: async (doc) => new Model(doc).save(),
};
