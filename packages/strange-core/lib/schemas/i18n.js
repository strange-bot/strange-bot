const { Schema } = require("strange-db-client");

const localizationSchema = new Schema({
    app: String,
    plugin: String,
    lang: String,
    data: Schema.Types.Mixed,
    lastModified: Date,
});

module.exports = localizationSchema;
