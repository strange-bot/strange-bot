const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = (member) => {
    const { guild } = member;

    let rolesString = member.roles.cache.map((r) => r.name).join(", ");
    if (rolesString.length > 1024) rolesString = rolesString.substring(0, 1020) + "...";

    const embed = EmbedUtils.embed();

    let color = member.displayHexColor;
    if (color !== "#000000") embed.setColor(color);

    embed
        .setAuthor({
            name: guild.getT("information:INFO.USER_EMBED_TITLE", { user: member.user.username }),
            iconURL: member.user.displayAvatarURL(),
        })
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            {
                name: guild.getT("information:INFO.USER_NAME"),
                value: member.user.username,
                inline: true,
            },
            {
                name: guild.getT("information:INFO.USER_ID"),
                value: member.id,
                inline: true,
            },
            {
                name: guild.getT("information:INFO.USER_JOINED"),
                value: member.joinedAt.toUTCString(),
            },
            {
                name: guild.getT("information:INFO.USER_CREATED"),
                value: member.user.createdAt.toUTCString(),
            },
            {
                name: `${guild.getT("information:INFO.USER_ROLES")} [${member.roles.cache.size}]`,
                value: rolesString,
            },
            {
                name: guild.getT("information:INFO.USER_AVATAR"),
                value: member.user.displayAvatarURL({ extension: "png" }),
            },
        )
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: member.user.username }) })
        .setTimestamp(Date.now());

    return { embeds: [embed] };
};
