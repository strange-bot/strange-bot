const { Schema } = require("strange-db-client");

const ConfigSchema = new Schema(
    {
        _id: String,
        config: {
            type: Object,
            default: {},
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

module.exports = ConfigSchema;
