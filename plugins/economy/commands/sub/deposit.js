const { EmbedUtils } = require("strange-sdk/utils");
const { getUser } = require("../../schemas/Economy");

module.exports = async (guild, user, coins) => {
    if (isNaN(coins) || coins <= 0) return guild.getT("economy:BANK.INVALID_DEPOSIT");

    const settings = guild.getSettings("economy");
    const userDb = await getUser(user);

    if (coins > userDb.coins)
        return guild.getT("economy:BANK.INSUFFICIENT_WALLET", {
            coins: userDb.coins,
            currency: settings.currency,
        });

    userDb.coins -= coins;
    userDb.bank += coins;
    await userDb.save();

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("economy:BANK.NEW_BALANCE") })
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            {
                name: guild.getT("economy:BANK.WALLET"),
                value: `${userDb.coins}${settings.currency}`,
                inline: true,
            },
            {
                name: guild.getT("economy:BANK.BANK"),
                value: `${userDb.bank}${settings.currency}`,
                inline: true,
            },
            {
                name: guild.getT("economy:BANK.NET"),
                value: `${userDb.coins + userDb.bank}${settings.currency}`,
                inline: true,
            },
        );

    return { embeds: [embed] };
};
