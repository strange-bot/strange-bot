const mongoose = require("mongoose");

const Schema = new mongoose.Schema(
    {
        _id: String,
        config: Object,
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);


module.exports = mongoose.model("config", Schema);
