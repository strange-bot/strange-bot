const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "autorole",
    description: "greeting:AUTOROLE.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<role|off>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "add",
                description: "greeting:AUTOROLE.SUB_ADD",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "role",
                        description: "greeting:AUTOROLE.SUB_ADD_ROLE",
                        type: ApplicationCommandOptionType.Role,
                        required: false,
                    },
                    {
                        name: "role_id",
                        description: "greeting:AUTOROLE.SUB_ADD_ROLE_ID",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "remove",
                description: "greeting:AUTOROLE.SUB_REMOVE",
                type: ApplicationCommandOptionType.Subcommand,
            },
        ],
    },

    async messageRun(message, args) {
        const input = args.join(" ");
        const settings = message.guild.getSettings("autorole");

        let response;

        if (input.toLowerCase() === "off") {
            response = await setAutoRole(message, null, settings);
        } else {
            const roles = message.guild.findMatchingRoles(input);
            if (roles.length === 0) {
                response = message.guild.getT("greeting:AUTOROLE.ROLE_NOT_FOUND");
            } else {
                response = await setAutoRole(message, roles[0], settings);
            }
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("autorole");
        let response;

        // add
        if (sub === "add") {
            let role = interaction.options.getRole("role");
            if (!role) {
                const role_id = interaction.options.getString("role_id");
                if (!role_id) return interaction.followUpT("greeting:AUTOROLE.MISSING_ROLE");

                const roles = interaction.guild.findMatchingRoles(role_id);
                if (roles.length === 0) {
                    return interaction.followUpT("greeting:AUTOROLE.ROLE_NOT_FOUND");
                }
                role = roles[0];
            }

            response = await setAutoRole(interaction, role, settings);
        }

        // remove
        else if (sub === "remove") {
            response = await setAutoRole(interaction, null, settings);
        }

        // default
        else response = interaction.guild.getT("common:INVALID_SUBCOMMAND", { sub });

        await interaction.followUp(response);
    },
};

/**
 * @param {import("discord.js").Message | import("discord.js").CommandInteraction} message
 * @param {import("discord.js").Role} role
 * @param {import("@models/Guild")} settings
 */
async function setAutoRole({ guild }, role, settings) {
    if (role) {
        if (role.id === guild.roles.everyone.id)
            return guild.getT("greeting:AUTOROLE.EVERYONE_ROLE");
        if (!guild.members.me.permissions.has("ManageRoles"))
            return guild.getT("greeting:AUTOROLE.MISSING_PERM");
        if (guild.members.me.roles.highest.position < role.position)
            return guild.getT("greeting:AUTOROLE.ROLE_PERM");
        if (role.managed) return guild.getT("greeting:AUTOROLE.MANAGED_ROLE");
    }

    if (!role) settings.role_id = null;
    else settings.role_id = role.id;

    await guild.updateSettings();
    return role
        ? guild.getT("greeting:AUTOROLE.ENABLED", { role: role.name })
        : guild.getT("greeting:AUTOROLE.DISABLED");
}
