const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema(
    {
        _id: String,
        config: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("config", ConfigSchema);
