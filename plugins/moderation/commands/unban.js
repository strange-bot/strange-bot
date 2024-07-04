const { unBanTarget } = require("../utils");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ApplicationCommandOptionType,
    ComponentType,
} = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "unban",
    description: "moderation:UNBAN.DESCRIPTION",
    botPermissions: ["BanMembers"],
    userPermissions: ["BanMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "name",
                description: "moderation:UNBAN.NAME_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:UNBAN.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const match = args[0];
        const reason = message.content.split(args[0])[1].trim();

        const response = await getMatchingBans(message.guild, match);
        const sent = await message.safeReply(response);
        if (typeof response !== "string") await waitForBan(message.member, reason, sent);
    },

    async interactionRun(interaction) {
        const match = interaction.options.getString("name");
        const reason = interaction.options.getString("reason");

        const response = await getMatchingBans(interaction.guild, match);
        const sent = await interaction.followUp(response);
        if (typeof response !== "string") await waitForBan(interaction.member, reason, sent);
    },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} match
 */
async function getMatchingBans(guild, match) {
    const bans = await guild.bans.fetch({ cache: false });

    const matched = [];
    for (const [, ban] of bans) {
        if (ban.user.partial) await ban.user.fetch();

        // exact match
        if (ban.user.id === match || ban.user.tag === match) {
            matched.push(ban.user);
            break;
        }

        // partial match
        if (ban.user.username.toLowerCase().includes(match.toLowerCase())) {
            matched.push(ban.user);
        }
    }

    if (matched.length === 0) return guild.getT("common:NO_MATCH_USER", { query: match });

    const options = [];
    for (const user of matched) {
        options.push({ label: user.tag, value: user.id });
    }

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("unban-menu")
            .setPlaceholder(guild.getT("moderation:UNBAN.MENU_PLACEHOLDER"))
            .addOptions(options),
    );

    return { content: guild.getT("moderation:UNBAN.MENU_CONTENT"), components: [menuRow] };
}

/**
 * @param {import('discord.js').GuildMember} issuer
 * @param {string} reason
 * @param {import('discord.js').Message} sent
 */
async function waitForBan(issuer, reason, sent) {
    const guild = issuer.guild;

    const collector = sent.channel.createMessageComponentCollector({
        filter: (m) =>
            m.member.id === issuer.id && m.customId === "unban-menu" && sent.id === m.message.id,
        time: 20000,
        max: 1,
        componentType: ComponentType.StringSelect,
    });

    //
    collector.on("collect", async (response) => {
        const userId = response.values[0];
        const user = await issuer.client.users.fetch(userId, { cache: true });

        const status = await unBanTarget(issuer, user, reason);
        return sent.edit({
            content: guild.getT(
                typeof status === "boolean"
                    ? "moderation:UNBAN.SUCCESS"
                    : "moderation:UNBAN.FAILED",
                {
                    target: user.username,
                },
            ),
            components: [],
        });
    });

    // collect user and unban
    collector.on("end", async (collected) => {
        if (collected.size === 0) return sent.edit(guild.getT("common:COLLECT_TIMEOUT"));
    });
}
