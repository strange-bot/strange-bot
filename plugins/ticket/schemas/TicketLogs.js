const mongoose = require("mongoose");

const reqString = {
    type: String,
    required: true,
};

const Schema = new mongoose.Schema(
    {
        guild_id: reqString,
        channel_id: reqString,
        ticket_id: reqString,
        category: String,
        opened_by: String,
        closed_by: String,
        reason: String,
        transcript: [
            {
                _id: false,
                author: String,
                content: String,
                embeds: [Object],
                timestamp: Date,
                bot: Boolean,
                attachments: [
                    {
                        _id: false,
                        name: String,
                        description: String,
                        url: String,
                    },
                ],
            },
        ],
    },
    {
        autoIndex: false,
        versionKey: false,
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

const Model = mongoose.model("tickets", Schema);

module.exports = {
    addTicketLog: async (data) => new Model(data).save(),

    closeTicketLog: async (guildId, channelId, ticketId, closedBy, reason, transcript) =>
        Model.findOneAndUpdate(
            { guild_id: guildId, channel_id: channelId, ticket_id: ticketId },
            {
                closed_by: closedBy,
                reason: reason,
                transcript: transcript,
            },
        ),

    getById: async (objectId) => Model.findById(objectId).lean(),
};
