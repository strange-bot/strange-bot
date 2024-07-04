const { GiveawaysManager } = require("discord-giveaways");
const Model = require("./schemas/Giveaways");

class MongooseGiveaways extends GiveawaysManager {
    /**
     * @param {import("discord.js").Client} client
     */
    constructor(client) {
        super(
            client,
            {
                default: {
                    botsCanWin: false,
                },
            },
            false, // do not initialize manager yet
        );
    }

    async getAllGiveaways() {
        return await Model.find().lean().exec();
    }

    async saveGiveaway(messageId, giveawayData) {
        await Model.create(giveawayData);
        return true;
    }

    async editGiveaway(messageId, giveawayData) {
        await Model.updateOne({ messageId }, giveawayData, { omitUndefined: true }).exec();
        return true;
    }

    async deleteGiveaway(messageId) {
        await Model.deleteOne({ messageId }).exec();
        return true;
    }
}

module.exports = (client) => new MongooseGiveaways(client);
