const { EmbedUtils } = require("strange-sdk/utils");
const { getUser } = require("../../schemas/Economy");

module.exports = async (guild, user) => {
    const settings = guild.getSettings("economy");
    const economy = await getUser(user);

    const embed = EmbedUtils.embed()
        .setAuthor({ name: user.username })
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            {
                name: guild.getT("economy:BANK.WALLET"),
                value: `${economy?.coins || 0}${settings.currency}`,
                inline: true,
            },
            {
                name: guild.getT("economy:BANK.BANK"),
                value: `${economy?.bank || 0}${settings.currency}`,
                inline: true,
            },
            {
                name: guild.getT("economy:BANK.NET"),
                value: `${(economy?.coins || 0) + (economy?.bank || 0)}${settings.currency}`,
                inline: true,
            },
        );

    return { embeds: [embed] };
};
