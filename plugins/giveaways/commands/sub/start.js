const { ChannelType } = require("discord.js");
const ems = require("enhanced-ms");
const { MiscUtils } = require("strange-sdk/utils");

const SETUP_PERMS = ["ViewChannel", "SendMessages", "EmbedLinks"];

/**
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').GuildTextBasedChannel} giveawayChannel
 * @param {number} duration
 * @param {string} prize
 * @param {number} winners
 * @param {string} hostId
 * @param {string} rolesString
 */
module.exports = async (member, giveawayChannel, duration, prize, winners, hostId, rolesString) => {
    try {
        const guild = member.guild;
        if (!member.permissions.has("ManageMessages")) return guild.getT("giveaways:MEMBER_PERMS");

        // channel
        if (!giveawayChannel.type === ChannelType.GuildText)
            return guild.getT("giveaways:START_CHANNEL_TYPE");
        if (!giveawayChannel.permissionsFor(guild.members.me).has(SETUP_PERMS)) {
            return guild.getT("giveaways:START_CHANNEL_PERMS", {
                permissions: MiscUtils.parsePermissions(SETUP_PERMS),
                channel: giveawayChannel,
            });
        }

        // prize

        // duration
        duration = ems(duration);
        if (isNaN(duration)) return guild.getT("giveaways:START_INVALID_DURATION");

        // winners
        if (!winners) winners = 1;
        if (isNaN(winners)) return guild.getT("giveaways:START_INVALID_WINNERS");

        // host
        let host = null;
        if (hostId) {
            try {
                host = await guild.client.users.fetch(hostId);
            } catch (ex) {
                return guild.geT("giveaways:START_INVALID_HOST");
            }
        }
        if (!host) host = member.user;

        // roles
        const allowedRoles =
            rolesString?.split(",")?.filter((roleId) => guild.roles.cache.get(roleId.trim())) || [];

        /**
         * @type {import("discord-giveaways").GiveawayStartOptions}
         */
        const options = {
            duration: duration,
            prize,
            winnerCount: winners,
            hostedBy: host,
            thumbnail: "https://i.imgur.com/DJuTuxs.png",
            messages: {
                giveaway: guild.getT("giveaways:MESSAGES.giveaway"),
                giveawayEnded: guild.getT("giveaways:MESSAGES.giveawayEnded"),
                title: guild.getT("giveaways:MESSAGES.title", { prize: "{this.prize}" }),
                inviteToParticipate: guild.getT("giveaways:MESSAGES.inviteToParticipate"),
                winMessage: guild.getT("giveaways:MESSAGES.winMessage", {
                    winners: "{winners}",
                    prize: "{this.prize}",
                    messageURL: "{this.messageURL}",
                }),
                drawing: guild.getT("giveaways:MESSAGES.drawing", { timestamp: "{timestamp}" }),
                dropMessage: "Be the first to react with 🎁 to win!",
                embedFooter: guild.getT("giveaways:MESSAGES.embedFooter", {
                    winnerCount: "{this.winnerCount}",
                }),
                noWinner: guild.getT("giveaways:MESSAGES.noWinner"),
                winners: guild.getT("giveaways:MESSAGES.winners"),
                endedAt: guild.getT("giveaways:MESSAGES.endedAt"),
                hostedBy: `\nHosted by: ${host.username}`,
            },
            extraData: {
                hostTag: host.username,
                allowedRoles,
            },
        };

        if (allowedRoles.length > 0) {
            options.exemptMembers = (member) =>
                !member.roles.cache.find((role) => allowedRoles.includes(role.id));
        }

        await member.client.giveawaysManager.start(giveawayChannel, options);
        return guild.getT("giveaways:START_SUCCESS", { channel: giveawayChannel.toString() });
    } catch (error) {
        member.client.logger.error("Giveaway Start", error);
        return member.guild.getT("giveaways:START_ERROR");
    }
};
