const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (member) => {
    const { guild } = member;

    // Permissions
    if (!member.permissions.has("ManageMessages")) {
        return guild.getT("giveaways:MEMBER_PERMS");
    }

    // Search with all giveaways
    const giveaways = member.client.giveawaysManager.giveaways.filter(
        (g) => g.guildId === member.guild.id && g.ended === false,
    );

    // No giveaways
    if (giveaways.length === 0) {
        return guild.getT("giveaways:NO_GIVEAWAYS");
    }

    try {
        return {
            embeds: [
                EmbedUtils.embed().setDescription(
                    giveaways.map((g, i) => `${i + 1}. ${g.prize} in <#${g.channelId}>`).join("\n"),
                ),
            ],
        };
    } catch (error) {
        member.client.logger.error("Giveaway List", error);
        return guild.getT("giveaways:LISTING_ERROR");
    }
};
