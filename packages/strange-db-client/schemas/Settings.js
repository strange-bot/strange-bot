const mongoose = require("mongoose");
const mongooseLeanDefaults = require("mongoose-lean-defaults").default;

const SettingsSchema = new mongoose.Schema(
    {
        _id: String,
        guild_name: String,
        joined_at: Date,
        left_at: Date,
        plugins: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: new Map(),
        },
    },
    {
        timestamps: true,
    },
);

SettingsSchema.plugin(mongooseLeanDefaults);
module.exports = mongoose.model("settings", SettingsSchema);
