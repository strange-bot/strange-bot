const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils, MiscUtils } = require("strange-sdk/utils");
const { getUser } = require("../schemas/Economy");

/**
 * @type {import('typings').CommandType}
 */
module.exports = {
    name: "gamble",
    description: "economy:GAMBLE.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<amount>",
        minArgsCount: 1,
        aliases: ["slot"],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "coins",
                description: "economy:GAMBLE.COINS_DESC",
                required: true,
                type: ApplicationCommandOptionType.Integer,
            },
        ],
    },

    async messageRun(message, args) {
        const betAmount = parseInt(args[0]);
        if (isNaN(betAmount)) return message.replyT("economy:GAMBLE.INVALID_AMOUNT");
        const response = await gamble(message.guild, message.author, betAmount);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const betAmount = interaction.options.getInteger("coins");
        const response = await gamble(interaction.guild, interaction.user, betAmount);
        await interaction.followUp(response);
    },
};

function getEmoji() {
    const ran = MiscUtils.getRandomInt(9);
    switch (ran) {
        case 1:
            return "\uD83C\uDF52";
        case 2:
            return "\uD83C\uDF4C";
        case 3:
            return "\uD83C\uDF51";
        case 4:
            return "\uD83C\uDF45";
        case 5:
            return "\uD83C\uDF49";
        case 6:
            return "\uD83C\uDF47";
        case 7:
            return "\uD83C\uDF53";
        case 8:
            return "\uD83C\uDF50";
        case 9:
            return "\uD83C\uDF4D";
        default:
            return "\uD83C\uDF52";
    }
}

function calculateReward(amount, var1, var2, var3) {
    if (var1 === var2 && var2.equals === var3) return 3 * amount;
    if (var1 === var2 || var2 === var3 || var1 === var3) return 2 * amount;
    return 0;
}

async function gamble(guild, user, betAmount) {
    if (isNaN(betAmount)) return guild.getT("economy:GAMBLE.INVALID_AMOUNT");
    if (betAmount < 0) return guild.getT("economy:GAMBLE.INVALID_AMOUNT_NEGATIVE");
    if (betAmount < 10) return guild.getT("economy:GAMBLE.INVALID_AMOUNT_MIN", { min: 10 });

    const settings = guild.getSettings("economy");
    const userDb = await getUser(user);
    if (userDb.coins < betAmount)
        return guild.getT("economy:GAMBLE.INSUFFICIENT_COINS", {
            coins: userDb.coins || 0,
            currency: settings.currency,
        });

    const slot1 = getEmoji();
    const slot2 = getEmoji();
    const slot3 = getEmoji();

    const str = `
    **${guild.getT("economy:GAMBLE.GAMBLE_TITLE")}:** ${betAmount}${settings.currency}
    **${guild.getT("economy:GAMBLE.MULTIPLIER")}:** 2x
    ╔══════════╗
    ║ ${getEmoji()} ║ ${getEmoji()} ║ ${getEmoji()} ‎‎‎‎║
    ╠══════════╣
    ║ ${slot1} ║ ${slot2} ║ ${slot3} ⟸
    ╠══════════╣
    ║ ${getEmoji()} ║ ${getEmoji()} ║ ${getEmoji()} ║
    ╚══════════╝
    `;

    const reward = calculateReward(betAmount, slot1, slot2, slot3);
    const balance = reward - betAmount;
    userDb.coins += balance;
    await userDb.save();

    const result =
        reward > 0
            ? guild.getT("economy:GAMBLE.GAMBLE_WIN", {
                  amount: reward,
                  coins: userDb?.coins,
                  currency: settings.currency,
              })
            : guild.getT("economy:GAMBLE.GAMBLE_LOSE", {
                  amount: betAmount,
                  coins: userDb?.coins,
                  currency: settings.currency,
              });

    const embed = EmbedUtils.embed()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setThumbnail(
            "https://i.pinimg.com/originals/9a/f1/4e/9af14e0ae92487516894faa9ea2c35dd.gif",
        )
        .setDescription(str)
        .setFooter({ text: result });

    return { embeds: [embed] };
}
