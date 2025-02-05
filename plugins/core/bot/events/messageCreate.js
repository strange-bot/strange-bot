const { handlePrefixCommand } = require("../handler");

/**
 * @param {import('discord.js').Message} message
 * @param {import('strange-sdk').BotPlugin} plugin
 */
module.exports = async (message, plugin) => {
    message.isCommand = false;
    if (!message.guild || message.author.bot) return;
    const guild = message.guild;

    const [config, settings] = await Promise.all([
        plugin.getConfig(),
        guild.getSettings(plugin.name),
    ]);

    if (!config["PREFIX_COMMANDS"]["ENABLED"]) return;

    // check for bot mentions
    if (message.content.includes(`${guild.client.user.id}`)) {
        message.channel.send(`> My prefix is \`${settings.prefix}\``);
    }

    if (message.content && message.content.startsWith(settings.prefix)) {
        const invoke = message.content.replace(`${settings.prefix}`, "").split(/\s+/)[0];
        const cmd = guild.client.prefixCommands.get(invoke);
        if (cmd) {
            // check if the plugin is disabled
            const pluginSettings = await guild.getSettings(cmd.plugin.name);
            if (pluginSettings.enabled === false) return;

            // check if the command is disabled
            if (settings.disabled_prefix.includes(cmd.name)) return;

            message.isCommand = true;
            const context = { plugin, settings, config };
            handlePrefixCommand(message, cmd, context);
        }
    }
};
