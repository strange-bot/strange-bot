const { ApplicationCommandOptionType } = require("discord.js");
const { MiscUtils, EmbedUtils } = require("strange-sdk/utils");
const config = require("./config");

const cooldownCache = new Map();
const OWNER_IDS = process.env.OWNER_IDS?.split(",").map((id) => id.trim());

/**
 * @param {import('discord.js').Message} message
 * @param {import('strange-sdk').CommandType} cmd
 * @param {object} settings
 */
async function handlePrefixCommand(message, cmd, settings) {
    const prefix = settings.prefix;
    const args = message.content.replace(prefix, "").split(/\s+/);
    const invoke = args.shift().toLowerCase();

    const data = {};
    data.prefix = prefix;
    data.invoke = invoke;

    if (!message.channel.permissionsFor(message.guild.members.me).has("SendMessages")) return;

    // callback validations
    if (cmd.validations) {
        for (const validation of cmd.validations) {
            if (!validation.callback(message)) {
                return message.safeReply(validation.message);
            }
        }
    }

    // Owner commands
    if (cmd.category === "OWNER" && !OWNER_IDS.includes(message.author.id)) {
        return message.replyT("core:HANDLER.OWNER_ONLY");
    }

    // check user permissions
    if (cmd.userPermissions && cmd.userPermissions?.length > 0) {
        if (!message.channel.permissionsFor(message.member).has(cmd.userPermissions)) {
            return message.replyT("core:HANDLER.USER_PERMISSIONS", {
                permissions: MiscUtils.parsePermissions(cmd.userPermissions),
            });
        }
    }

    // check bot permissions
    if (cmd.botPermissions && cmd.botPermissions.length > 0) {
        if (!message.channel.permissionsFor(message.guild.members.me).has(cmd.botPermissions)) {
            return message.replyT("core:HANDLER.BOT_PERMISSIONS", {
                permissions: MiscUtils.parsePermissions(cmd.botPermissions),
            });
        }
    }

    // minArgs count
    if (cmd.command.minArgsCount > args.length) {
        const usageEmbed = getCommandUsage(message.guild, cmd, prefix, invoke);
        return message.safeReply({ embeds: [usageEmbed] });
    }

    // cooldown check
    if (cmd.cooldown > 0) {
        const remaining = getRemainingCooldown("cmd", message.author.id, cmd);
        if (remaining > 0) {
            return message.replyT("core:HANDLER.COOLDOWN", {
                time: MiscUtils.timeformat(remaining),
            });
        }
    }

    try {
        await cmd.messageRun(message, args, data);
    } catch (ex) {
        message.client.logger.error("messageRun", ex);
        message.replyT("core:HANDLER.ERROR");
    } finally {
        if (cmd.cooldown > 0) applyCooldown("cmd", message.author.id, cmd);
    }
}

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('strange-sdk').CommandType} cmd
 */
async function handleSlashCommand(interaction, cmd) {
    const guild = interaction.guild;

    // callback validations
    if (cmd.validations) {
        for (const validation of cmd.validations) {
            if (!validation.callback(interaction)) {
                return interaction.reply({
                    content: validation.message,
                    ephemeral: true,
                });
            }
        }
    }

    // Owner commands
    if (cmd.category === "OWNER" && !OWNER_IDS.includes(interaction.user.id)) {
        return interaction.reply({
            content: guild.getT("core:HANDLER.OWNER_ONLY"),
            ephemeral: true,
        });
    }

    // user permissions
    if (interaction.member && cmd.userPermissions?.length > 0) {
        if (!interaction.member.permissions.has(cmd.userPermissions)) {
            return interaction.reply({
                content: guild.getT("core:HANDLER.USER_PERMISSIONS", {
                    permissions: MiscUtils.parsePermissions(cmd.userPermissions),
                }),
                ephemeral: true,
            });
        }
    }

    // bot permissions
    if (cmd.botPermissions && cmd.botPermissions.length > 0) {
        if (!interaction.guild.members.me.permissions.has(cmd.botPermissions)) {
            return interaction.reply({
                content: guild.getT("core:HANDLER.BOT_PERMISSIONS", {
                    permissions: MiscUtils.parsePermissions(cmd.botPermissions),
                }),
                ephemeral: true,
            });
        }
    }

    // cooldown check
    if (cmd.cooldown > 0) {
        const remaining = getRemainingCooldown("cmd", interaction.user.id, cmd);
        if (remaining > 0) {
            return interaction.reply({
                content: guild.getT("core:HANDLER.COOLDOWN", {
                    time: MiscUtils.timeformat(remaining),
                }),
                ephemeral: true,
            });
        }
    }

    try {
        await interaction.deferReply({ ephemeral: cmd.slashCommand.ephemeral });
        await cmd.interactionRun(interaction);
    } catch (ex) {
        await interaction.followUpT("core:HANDLER.ERROR");
        interaction.client.logger.error("interactionRun", ex);
    } finally {
        if (cmd.cooldown > 0) applyCooldown("cmd", interaction.user.id, cmd);
    }
}

/**
 * Build a usage embed for this command
 * @param {import('discord.js').Guild} guild - guild object
 * @param {import('strange-sdk').CommandType} cmd - command object
 * @param {string} prefix - guild bot prefix
 * @param {string} invoke - alias that was used to trigger this command
 * @param {string} [title] - the embed title
 */
function getCommandUsage(
    guild,
    cmd,
    prefix = config.get("PREFIX_COMMANDS").DEFAULT_PREFIX,
    invoke,
    title = "Usage",
) {
    let desc = "";
    if (cmd.command.subcommands && cmd.command.subcommands.length > 0) {
        cmd.command.subcommands.forEach((sub) => {
            desc += `\`${prefix}${invoke || cmd.name} ${sub.trigger}\`\n❯ ${guild.getT(sub.description)}\n\n`;
        });
        if (cmd.cooldown) {
            desc += `**Cooldown:** ${MiscUtils.timeformat(cmd.cooldown)}`;
        }
    } else {
        desc += `\`\`\`css\n${prefix}${invoke || cmd.name} ${cmd.command.usage}\`\`\``;
        if (cmd.description !== "") desc += `\n**Help:** ${guild.getT(cmd.description)}`;
        if (cmd.cooldown) desc += `\n**Cooldown:** ${MiscUtils.timeformat(cmd.cooldown)}`;
    }

    const embed = EmbedUtils.embed({ description: desc });
    if (title) embed.setAuthor({ name: title });
    return embed;
}

/**
 * @param {import('discord.js').Guild} guild - guild object
 * @param {import('strange-sdk').CommandType} cmd - command object
 */
function getSlashUsage(guild, cmd) {
    let desc = "";
    if (cmd.slashCommand.options.find((o) => o.type === ApplicationCommandOptionType.Subcommand)) {
        const subCmds = cmd.slashCommand.options.filter(
            (opt) => opt.type === ApplicationCommandOptionType.Subcommand,
        );
        subCmds.forEach((sub) => {
            desc += `\`/${cmd.name} ${sub.name}\`\n❯ ${guild.getT(sub.description)}\n\n`;
        });
    } else {
        desc += `\`/${cmd.name}\`\n\n**Help:** ${guild.getT(cmd.description)}`;
    }

    if (cmd.cooldown) {
        desc += `\n**Cooldown:** ${MiscUtils.timeformat(cmd.cooldown)}`;
    }

    return EmbedUtils.embed({ description: desc });
}

/**
 * @param {import('discord.js').ContextMenuCommandInteraction} interaction
 * @param {import('strange-sdk').ContextType} context
 */
async function handleContext(interaction, context) {
    const guild = interaction.guild;

    // check cooldown
    if (context.cooldown) {
        const remaining = getRemainingCooldown("ctx", interaction.user.id, context);
        if (remaining > 0) {
            return interaction.reply({
                content: guild.getT("core:HANDLER.COOLDOWN", {
                    time: MiscUtils.timeformat(remaining),
                }),
                ephemeral: true,
            });
        }
    }

    // check user permissions
    if (interaction.member && context.userPermissions && context.userPermissions?.length > 0) {
        if (!interaction.member.permissions.has(context.userPermissions)) {
            return interaction.reply({
                content: guild.getT("core:HANDLER.USER_PERMISSIONS", {
                    permissions: MiscUtils.parsePermissions(context.userPermissions),
                }),
                ephemeral: true,
            });
        }
    }

    try {
        await interaction.deferReply({ ephemeral: context.ephemeral });
        await context.run(interaction);
    } catch (ex) {
        interaction.followUpT("core:HANDLER.ERROR");
        interaction.client.logger.error("contextRun", ex);
    } finally {
        applyCooldown("ctx", interaction.user.id, context);
    }
}

/**
 * @param {string} type
 * @param {string} memberId
 * @param {object} cmd
 */
function applyCooldown(type, memberId, cmd) {
    const key = type + "|" + cmd.name + "|" + memberId;
    cooldownCache.set(key, Date.now());
}

/**
 * @param {string} type
 * @param {string} memberId
 * @param {object} cmd
 */
function getRemainingCooldown(type, memberId, cmd) {
    const key = type + "|" + cmd.name + "|" + memberId;
    if (cooldownCache.has(key)) {
        const remaining = (Date.now() - cooldownCache.get(key)) * 0.001;
        if (remaining > cmd.cooldown) {
            cooldownCache.delete(key);
            return 0;
        }
        return cmd.cooldown - remaining;
    }
    return 0;
}

module.exports = {
    handlePrefixCommand,
    handleSlashCommand,
    getCommandUsage,
    getSlashUsage,
    handleContext,
};
