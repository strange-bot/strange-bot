const mongoose = require("mongoose");

const localizationSchema = new mongoose.Schema({
    plugin: String,
    lang: String,
    data: mongoose.Schema.Types.Mixed,
    lastModified: Date,
});

module.exports = mongoose.model("Localization", localizationSchema);
