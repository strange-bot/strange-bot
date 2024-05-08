const mongoose = require("mongoose");
const config = require("../../config");

const cache = new Map();

const ReqString = {
    type: String,
    required: true,
};

const Schema = new mongoose.Schema(
    {
        _id: ReqString,
        locale: { type: String, default: config.LOCALE.DEFAULT },
        logged_in: { type: Boolean, default: false },
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

const Model = mongoose.model("dashboard", Schema);

module.exports = {
    get: async (userId) => {
        if (cache.contains(userId)) return cache.get(userId);

        let data = await Model.findById(userId);
        if (!data) {
            data = new Model({
                _id: userId,
            });
        }

        cache.add(userId, data);
        return data;
    },
};
