const mongoose = require("mongoose");

const ReqString = {
    type: String,
    required: true,
};

const Schema = new mongoose.Schema(
    {
        _id: ReqString,
        locale: String,
        logged_in: Boolean,
        tokens: {
            access_token: String,
            refresh_token: String,
            expires: Number,
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

module.exports = mongoose.model("dashboard", Schema);
