const { canModerate } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "nick",
    description: "moderation:NICK.DESCRIPTION",
    botPermissions: ["ManageNicknames"],
    userPermissions: ["ManageNicknames"],
    command: {
        enabled: true,
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "set <@member> <name>",
                description: "moderation:NICK.SUB_SET_DESC",
            },
            {
                trigger: "reset <@member>",
                description: "moderation:NICK.SUB_RESET_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "set",
                description: "moderation:NICK.SUB_SET_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:NICK.SUB_SET_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "name",
                        description: "moderation:NICK.SUB_SET_NAME",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "reset",
                description: "moderation:NICK.SUB_RESET_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:NICK.SUB_RESET_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0].toLowerCase();

        if (sub === "set") {
            const target = await message.guild.resolveMember(args[1]);
            if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
            const name = args.slice(2).join(" ");
            if (!name) return message.replyT("moderation:COMMON.MISSING_NICK");

            const response = await nickname(message, target, name);
            return message.safeReply(response);
        }

        //
        else if (sub === "reset") {
            const target = await message.guild.resolveMember(args[1]);
            if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });

            const response = await nickname(message, target);
            return message.safeReply(response);
        }

        return message.replyT("common:INVALID_SUBCOMMAND", { sub });
    },

    async interactionRun(interaction) {
        const name = interaction.options.getString("name");
        const target = await interaction.guild.members.fetch(interaction.options.getUser("user"));

        const response = await nickname(interaction, target, name);
        await interaction.followUp(response);
    },
};

async function nickname({ member, guild }, target, name) {
    if (!canModerate(member, target)) {
        return guild.getT("moderation:NICK.MEMBER_PERM", { user: target.user.username });
    }
    if (!canModerate(guild.members.me, target)) {
        return guild.getT("moderation:NICK.BOT_PERM", { user: target.user.username });
    }

    try {
        await target.setNickname(name);
        return name
            ? guild.getT("moderation:NICK.SET_SUCCESS", {
                  target: target.user.username,
                  nickname: name,
              })
            : guild.getT("moderation:NICK.RESET_SUCCESS", { target: target.user.username });
    } catch (ex) {
        return guild.getT(name ? "moderation:NICK.SET_FAIL" : "moderation:NICK.RESET_FAIL", {
            target: target.user.username,
        });
    }
}
