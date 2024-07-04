const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "inviterank",
    description: "invites:RANK.DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<role-name> <invites>",
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "add <role> <invites>",
                description: "invites:RANK.ADD_DESC",
            },
            {
                trigger: "remove role",
                description: "invites:RANK.REMOVE_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "add",
                description: "invites:RANK.ADD_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "role",
                        description: "invites:RANK.ADD_ROLE_DESC",
                        type: ApplicationCommandOptionType.Role,
                        required: true,
                    },
                    {
                        name: "invites",
                        description: "invites:RANK.ADD_INVITES_DESC",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "remove",
                description: "invites:RANK.REMOVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "role",
                        description: "invites:RANK.REMOVE_ROLE_DESC",
                        type: ApplicationCommandOptionType.Role,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0].toLowerCase();
        const settings = message.guild.getSettings("invites");

        if (sub === "add") {
            const query = args[1];
            const invites = args[2];

            if (isNaN(invites))
                return message.replyT("invites:RANK.INVALID_INVITES", { match: invites });
            const role = message.guild.findMatchingRoles(query)[0];
            if (!role) return message.replyT("invites:RANK.INVALID_ROLE", { match: query });

            const response = await addInviteRank(message, role, invites, settings);
            await message.safeReply(response);
        }

        //
        else if (sub === "remove") {
            const query = args[1];
            const role = message.guild.findMatchingRoles(query)[0];
            if (!role) return message.replyT("invites:RANK.INVALID_ROLE", { match: query });
            const response = await removeInviteRank(message, role, settings);
            await message.safeReply(response);
        }

        //
        else {
            await message.replyT("common:INVALID_SUBCOMMAND", { sub });
        }
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("invites");

        //
        if (sub === "add") {
            const role = interaction.options.getRole("role");
            const invites = interaction.options.getInteger("invites");

            const response = await addInviteRank(interaction, role, invites, settings);
            await interaction.followUp(response);
        }

        //
        else if (sub === "remove") {
            const role = interaction.options.getRole("role");
            const response = await removeInviteRank(interaction, role, settings);
            await interaction.followUp(response);
        }
    },
};

async function addInviteRank({ guild }, role, invites, settings) {
    if (!settings.enabled) return guild.getT("invites:RANK.DISABLED");

    if (role.managed) {
        return guild.getT("invites:RANK.BOT_ROLE");
    }

    if (guild.roles.everyone.id === role.id) {
        return guild.getT("invites:RANK.EVERYONE_ROLE");
    }

    if (!role.editable) {
        return guild.getT("invites:RANK.MISSING_PERM");
    }

    const exists = settings.ranks.find((obj) => obj._id === role.id);

    let msg = "";
    if (exists) {
        exists.invites = invites;
        msg += guild.getT("invites:RANK.PREVIOUS_FOUND") + "\n";
    } else {
        settings.ranks.push({ _id: role.id, invites });
    }

    await guild.updateSettings();
    return msg + guild.getT("invites:RANK.SUCCESS");
}

async function removeInviteRank({ guild }, role, settings) {
    if (!settings.enabled) return guild.getT("invites:RANK.DISABLED");

    if (role.managed) {
        return guild.getT("invites:RANK.BOT_ROLE");
    }

    if (guild.roles.everyone.id === role.id) {
        return guild.getT("invites:RANK.EVERYONE_ROLE");
    }

    if (!role.editable) {
        return guild.getT("invites:RANK.MISSING_PERM");
    }

    const exists = settings.ranks.find((obj) => obj._id === role.id);
    if (!exists) return guild.getT("invites:RANK.NOT_FOUND");

    // delete element from array
    const i = settings.ranks.findIndex((obj) => obj._id === role.id);
    if (i > -1) settings.ranks.splice(i, 1);

    await guild.updateSettings();
    return guild.getT("invites:RANK.SUCCESS");
}
