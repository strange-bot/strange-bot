const { AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { getMemberStats, getXpLb } = require("../schemas/MemberStats");
const { HttpUtils } = require("strange-sdk/utils");
const config = require("../config");

const STRANGE_IMAGE_API = config.get("STRANGE_API_URL");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "rank",
    description: "stats:RANK.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["AttachFiles"],
    command: {
        enabled: true,
        usage: "[@member|id]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "stats:RANK.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const member = (await message.guild.resolveMember(args[0])) || message.member;
        const response = await getRank(message, member);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;
        const member = await interaction.guild.members.fetch(user);
        const response = await getRank(interaction, member);
        await interaction.followUp(response);
    },
};

async function getRank({ guild }, member) {
    const { user } = member;
    const settings = guild.getSettings("stats");

    if (!settings.enabled) return guild.getT("stats:COMMON.DISABLED");

    const memberStats = await getMemberStats(guild.id, user.id);
    if (!memberStats.xp) return guild.getT("stats:RANK.NOT_ENOUGH_XP", { user: user.username });

    const lb = await getXpLb(guild.id, 100);
    let pos = -1;
    lb.forEach((doc, i) => {
        if (doc.member_id == user.id) {
            pos = i + 1;
        }
    });

    const xpNeeded = memberStats.level * memberStats.level * 100;
    const rank = pos !== -1 ? pos : 0;

    const url = new URL(`${STRANGE_IMAGE_API}/utils/rank-card`);
    url.searchParams.append("name", user.username);
    if (user.discriminator != 0) url.searchParams.append("discriminator", user.discriminator);
    url.searchParams.append("avatar", user.displayAvatarURL({ extension: "png", size: 128 }));
    url.searchParams.append("currentxp", memberStats.xp);
    url.searchParams.append("reqxp", xpNeeded);
    url.searchParams.append("level", memberStats.level);
    // url.searchParams.append("barcolor", EMBED_COLORS.BOT_EMBED);
    url.searchParams.append("status", member?.presence?.status?.toString() || "idle");
    url.searchParams.append("rank", rank);

    const response = await HttpUtils.getBuffer(url.href, {
        headers: {
            Authorization: `Bearer ${config.get("STRANGE_API_KEY")}`,
        },
    });
    if (!response.success) return guild.getT("stats:RANK.API_ERROR");

    const attachment = new AttachmentBuilder(response.buffer, { name: "rank.png" });
    return { files: [attachment] };
}
