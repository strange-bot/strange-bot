const { EmbedUtils } = require("strange-sdk/utils");
const { getUser } = require("../../schemas/Economy");

module.exports = async (guild, self, target, coins) => {
    if (isNaN(coins) || coins <= 0) return guild.getT("economy:BANK.INVALID_TRANSFER_AMOUNT");
    if (target.bot) return guild.getT("economy:BANK.TRANSFER_BOTS");
    if (target.id === self.id) return guild.getT("economy:BANK.TRANSFER_SELF");

    const settings = guild.getSettings("economy");
    const userDb = await getUser(self);

    if (userDb.bank < coins) {
        return `${guild.getT("economy:BANK.TRANSFER_INSUFFICIENT", {
            coins: userDb.bank,
            currency: settings.CURRENCY,
        })}.${userDb.coins > 0 && "\n" + guild.getT("economy:BANK.TRANSFER_DEPOSIT")} `;
    }

    const targetDb = await getUser(target);

    userDb.bank -= coins;
    targetDb.bank += coins;

    await userDb.save();
    await targetDb.save();

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("economy:BANK.UPDATED_BALANCE") })
        .setDescription(
            guild.getT("economy:BANK.TRANSFER_SUCCESS", {
                coins: coins,
                currency: settings.CURRENCY,
                target: target.username,
            }),
        )
        .setTimestamp(Date.now());

    return { embeds: [embed] };
};
