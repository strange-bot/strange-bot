const { escapeInlineCode, ApplicationCommandOptionType } = require("discord.js");
const { Logger, EmbedUtils } = require("strange-sdk/utils");

const leaderboardTypes = [];

let getInvitesLb = null;
try {
    getInvitesLb = require("../../invites/schemas/Invites").getInvitesLb;
    leaderboardTypes.push("invite");
} catch (e) {
    Logger.warn("Invites plugin is not enabled. Invite leaderboard will not work");
}

let getReputationLb = null;
try {
    getReputationLb = require("../../social/schemas/Social").getReputationLb;
    leaderboardTypes.push("rep");
} catch (e) {
    Logger.warn("Social plugin is not enabled. Reputation leaderboard will not work");
}

let getXpLb = null;
try {
    getXpLb = require("../../stats/schemas/MemberStats").getXpLb;
    leaderboardTypes.push("xp");
} catch (e) {
    Logger.warn("Stats plugin is not enabled. XP leaderboard will not work");
}

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "leaderboard",
    description: "information:LB.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        aliases: ["lb"],
        minArgsCount: 1,
        usage: "<xp|invite|rep>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "type",
                description: "information:LB.SUB_TYPE_DESC",
                required: true,
                type: ApplicationCommandOptionType.String,
                choices:
                    leaderboardTypes.length > 0
                        ? leaderboardTypes.map((type) => ({
                              name: type,
                              value: type,
                          }))
                        : undefined,
            },
        ],
    },
    async messageRun(message, args) {
        const type = args[0].toLowerCase();
        let response;

        if (type == "xp" && leaderboardTypes.includes("xp")) {
            response = await getXpLeaderboard(message, message.author);
        }

        // invite
        else if (type == "invite" && leaderboardTypes.includes("invite")) {
            response = await getInviteLeaderboard(message, message.author);
        }

        // rep
        else if (type == "rep" && leaderboardTypes.includes("rep")) {
            response = await getRepLeaderboard(message, message.author);
        }

        // no match
        else {
            response = message.guild.getT("information:LB.INVALID_TYPE", {
                type: type,
                validTypes: leaderboardTypes.join(", "),
            });
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const type = interaction.options.getString("type");
        let response;

        switch (type) {
            case "xp" && leaderboardTypes.includes("xp"):
                response = await getXpLeaderboard(interaction, interaction.user);
                break;
            case "invite" && leaderboardTypes.includes("invite"):
                response = await getInviteLeaderboard(interaction, interaction.user);
                break;
            case "rep" && leaderboardTypes.includes("rep"):
                response = await getRepLeaderboard(interaction, interaction.user);
                break;
            default:
                response = interaction.guild.getT("information:LB.INVALID_TYPE", {
                    type: type,
                    validTypes: leaderboardTypes.join(", "),
                });
        }
        await interaction.followUp(response);
    },
};

async function getXpLeaderboard({ guild }, author) {
    const settings = await guild.getSettings("stats");
    if (!settings || !settings.enabled) return guild.getT("information:LB.STATS_DISABLED");

    const lb = await getXpLb(guild.id, 10);
    if (lb.length === 0) return guild.getT("information:LB.NO_USERS");

    let collector = "";
    for (let i = 0; i < lb.length; i++) {
        try {
            const user = await author.client.users.fetch(lb[i].member_id);
            collector += `**#${(i + 1).toString()}** - ${escapeInlineCode(user.tag)}\n`;
        } catch (ex) {
            // Ignore
        }
    }

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("information:LB.STATS_LB_TITLE") })
        .setDescription(collector)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

    return { embeds: [embed] };
}

async function getInviteLeaderboard({ guild }, author) {
    const settings = await guild.getSettings("invites");
    if (!settings || !settings.enabled) return guild.getT("information:LB.INVITE_DISABLED");

    const lb = await getInvitesLb(guild.id, 10);
    if (lb.length === 0) return guild.getT("information:LB.NO_USERS");

    let collector = "";
    for (let i = 0; i < lb.length; i++) {
        try {
            const memberId = lb[i].member_id;
            if (memberId === "VANITY")
                collector += `**#${(i + 1).toString()}** - Vanity URL [${lb[i].invites}]\n`;
            else {
                const user = await author.client.users.fetch(lb[i].member_id);
                collector += `**#${(i + 1).toString()}** - ${escapeInlineCode(user.tag)} [${lb[i].invites}]\n`;
            }
        } catch (ex) {
            collector += `**#${(i + 1).toString()}** - DeletedUser#0000 [${lb[i].invites}]\n`;
        }
    }

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("information:LB.INVITE_LB_TITLE") })
        .setDescription(collector)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

    return { embeds: [embed] };
}

async function getRepLeaderboard({ guild }, author) {
    const lb = await getReputationLb(10);
    if (lb.length === 0) return guild.getT("information:LB.NO_USERS");

    let collector = "";
    for (let i = 0; i < lb.length; i++) {
        try {
            const user = await author.client.users.fetch(lb[i].member_id);
            collector += `**#${(i + 1).toString()}** - ${escapeInlineCode(user.tag)} [${lb[i].rep}]\n`;
        } catch (ex) {
            collector += `**#${(i + 1).toString()}** - DeletedUser#0000 [${lb[i].rep}]\n`;
        }
    }

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("information:LB.REP_LB_TITLE") })
        .setDescription(collector)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

    return { embeds: [embed] };
}
