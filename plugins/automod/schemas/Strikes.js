const mongoose = require("mongoose");
const FixedSizeMap = require("fixedsize-map");

const cache = new FixedSizeMap(10000);

const ReqString = {
    type: String,
    required: true,
};

const Schema = new mongoose.Schema(
    {
        guild_id: ReqString,
        member_id: ReqString,
        strikes: { type: Number, default: 0 },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

const Model = mongoose.model("strikes", Schema);

module.exports = {
    getMember: async (guildId, memberId) => {
        const key = `${guildId}|${memberId}`;
        if (cache.contains(key)) return cache.get(key);

        let member = await Model.findOne({ guild_id: guildId, member_id: memberId });
        if (!member) {
            member = new Model({
                guild_id: guildId,
                member_id: memberId,
            });
        }

        cache.add(key, member);
        return member;
    },
};
