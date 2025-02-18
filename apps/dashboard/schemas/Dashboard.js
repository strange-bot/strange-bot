const { Schema } = require("strange-db-client");

module.exports = new Schema(
    {
        _id: String,
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
        cache: {
            enabled: true,
        },
    },
);
