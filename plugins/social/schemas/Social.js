const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
    _id: String,
    reputation: {
        received: { type: Number, default: 0 },
        given: { type: Number, default: 0 },
        timestamp: Date,
    },
});

const Model = mongoose.model("user", Schema);

module.exports = {
    getSocial: async (user) => {
        if (!user) throw new Error("User is required.");
        if (!user.id) throw new Error("User Id is required.");

        return Model.findOne({ id: user.id });
    },

    getReputationLb: async (limit = 10) => {
        return Model.find({}).sort({ "reputation.received": -1 }).limit(limit);
    },
};
