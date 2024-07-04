const mongoose = require("mongoose");
const PluginManager = require("./PluginManager");
const { Logger } = require("strange-sdk/utils");

mongoose.set("strictQuery", true);

class Settings {
    static cache = new Map();
    static Model = null;

    static async init() {
        Settings.Model = mongoose.model(
            "guild",
            new mongoose.Schema({
                _id: String,
                guild_name: { type: String, required: true },
                joined_at: { type: Date, required: true },
                left_at: Date,
                plugins: PluginManager.allSettings,
            }),
        );

        const docs = await Settings.Model.find();
        for (const doc of docs) {
            Settings.cache.set(doc._id, doc);
        }

        Logger.success("Mongoose: Loaded all guild settings");
    }

    static get(guild) {
        let cached = Settings.cache.get(guild.id);
        if (cached) return cached;
        const doc = new Settings.Model({
            _id: guild.id,
            guild_name: guild.name,
            joined_at: guild.joinedAt,
        });

        Settings.cache.set(doc._id, doc);
        return doc;
    }
}

module.exports = Settings;
