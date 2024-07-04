const { EmbedUtils } = require("strange-sdk/utils");
const { getUser } = require("../../schemas/Economy");

module.exports = async (guild, user, coins) => {
    if (isNaN(coins) || coins <= 0) return guild.getT("economy:BANK.INVALID_WITHDRAW");

    const settings = guild.getSettings("economy");
    const userDb = await getUser(user);

    if (coins > userDb.bank)
        return guild.getT("economy:BANK.INSUFFICIENT_BANK", {
            coins: userDb.bank,
            currency: settings.currency,
        });

    userDb.bank -= coins;
    userDb.coins += coins;
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
