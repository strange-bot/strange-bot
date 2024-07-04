const { EmbedUtils, MiscUtils } = require("strange-sdk/utils");
const { getUser } = require("../schemas/Economy");

/**
 * @type {import('typings').CommandType}
 */
module.exports = {
    name: "daily",
    description: "economy:DAILY.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = await daily(message.guild, message.author);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = await daily(interaction.guild, interaction.user);
        await interaction.followUp(response);
    },
};

async function daily(guild, user) {
    const settings = guild.getSettings("economy");
    const userDb = await getUser(user);
    let streak = 0;

    if (userDb.daily.timestamp) {
        const lastUpdated = new Date(userDb.daily.timestamp);
        const difference = MiscUtils.diffHours(new Date(), lastUpdated);
        if (difference < 24) {
            const nextUsage = lastUpdated.setHours(lastUpdated.getHours() + 24);
            return guild.getT("economy:DAILY.ALREADY_CLAIMED", {
                time: MiscUtils.getRemainingTime(nextUsage),
            });
        }
        streak = userDb.daily.streak || streak;
        if (difference < 48) streak += 1;
        else streak = 0;
    }

    userDb.daily.streak = streak;
    userDb.coins += settings.daily_coins;
    userDb.daily.timestamp = new Date();
    await userDb.save();

    const embed = EmbedUtils.embed()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setDescription(
            guild.getT("economy:DAILY.CLAIMED", {
                daily: settings.daily_coins,
                currency: settings.currency,
                coins: userDb.coins,
            }),
        );

    return { embeds: [embed] };
}
