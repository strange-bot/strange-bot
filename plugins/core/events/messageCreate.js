const { handlePrefixCommand } = require("../handler");
const config = require("../config");

/**
 * @param {import('discord.js').Message} message
 */
module.exports = async (message) => {
    message.isCommand = false;
    if (!message.guild || message.author.bot) return;
    const guild = message.guild;

    if (!config.get("PREFIX_COMMANDS").ENABLED) return;

    const settings = guild.getSettings("core");

    // check for bot mentions
    if (message.content.includes(`${guild.client.user.id}`)) {
        message.channel.safeSend(`> My prefix is \`${settings.prefix}\``);
    }

    if (message.content && message.content.startsWith(settings.prefix)) {
        const invoke = message.content.replace(`${settings.prefix}`, "").split(/\s+/)[0];
        const cmd = guild.client.prefixCommands.get(invoke);
        if (cmd) {
            // check if the plugin is disabled
            if (guild.getSettings(cmd.plugin.name).enabled === false) return;

            // check if the command is disabled
            if (settings.disabled_prefix.includes(cmd.name)) return;

            message.isCommand = true;
            handlePrefixCommand(message, cmd, settings);
        }
    }
};
