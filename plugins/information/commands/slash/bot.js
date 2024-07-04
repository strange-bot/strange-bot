const { ApplicationCommandOptionType } = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");
const botInvite = require("../shared/botinvite");
const botstats = require("../shared/botstats");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "bot",
    description: "information:BOT.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "invite",
                description: "information:BOT.SUB_INVITE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "stats",
                description: "information:BOT.SUB_STATS_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "uptime",
                description: "information:BOT.SUB_UPTIME_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
        ],
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        if (!sub) return interaction.followUp("Not a valid subcommand");

        // Invite
        if (sub === "invite") {
            const response = botInvite(interaction);
            try {
                await interaction.user.send(response);
                return interaction.followUpT("information:BOT.INVITE_DM_SENT");
            } catch (ex) {
                return interaction.followUpT("information:BOT.INVITE_DM_FAILED");
            }
        }

        // Stats
        else if (sub === "stats") {
            const response = botstats(interaction);
            return interaction.followUp(response);
        }

        // Uptime
        else if (sub === "uptime") {
            await interaction.followUpT("information:BOT.UPTIME", {
                time: MiscUtils.timeformat(process.uptime()),
            });
        }

        // Invalid
        else {
            return interaction.followUpT("common:INVALID_SUBCOMMAND", { sub });
        }
    },
};
