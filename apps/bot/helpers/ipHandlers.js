const { ChannelType } = require("discord.js");
const { languagesMeta } = require("strange-core");

module.exports = {
    VALIDATE_GUILD: (_client) => {
        return true;
    },

    GET_BOT_GUILDS: (client) => {
        return [...client.guilds.cache.keys()];
    },

    GET_GUILD_STATS: (client, payload) => {
        const guild = client.guilds.cache.get(payload);
        return guild
            ? {
                  channels: {
                      text: guild.channels.cache.filter((c) => c.type === ChannelType.GuildText)
                          .size,
                      voice: guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice)
                          .size,
                  },
                  roles: guild.roles.cache.size,
                  members: guild.memberCount,
              }
            : null;
    },

    GET_CMDS_SUMMARY: (client) => {
        const data = {};
        client.pluginManager.plugins.forEach((plugin) => {
            data[plugin.name] = {
                prefixCount: plugin.prefixCount,
                slashCount: plugin.slashCount,
            };
        });

        return data;
    },

    GET_PLUGIN_CMDS: (client, payload) => {
        const { pluginName, type } = payload;

        const data = {};
        if (!type || type === "prefix") {
            const uniqueCommands = new Set();
            const prefixCommands = client.commandManager.prefixCommands
                .filter((cmd) => {
                    if (cmd.plugin?.name === pluginName && !uniqueCommands.has(cmd.name)) {
                        uniqueCommands.add(cmd.name);
                        return true;
                    }
                    return false;
                })
                .map((cmd) =>
                    structuredClone({
                        name: cmd.name,
                        description: client.i18n.tr(cmd.description),
                        aliases: cmd.command.aliases,
                    }),
                );
            data.prefix = prefixCommands;
        }

        if (!type || type === "slash") {
            const uniqueCommands = new Set();
            const slashCommands = client.commandManager.slashCommands
                .filter((cmd) => {
                    if (cmd.plugin?.name === pluginName && !uniqueCommands.has(cmd.name)) {
                        uniqueCommands.add(cmd.name);
                        return true;
                    }
                    return false;
                })
                .map((cmd) =>
                    structuredClone({
                        name: cmd.name,
                        description: client.i18n.tr(cmd.description),
                    }),
                );
            data.slash = slashCommands;
        }

        return data;
    },

    GET_LOCALE_BUNDLE: (client, _payload) => {
        const resourceBundle = {};
        const availableLanguages = languagesMeta.map((l) => l.name);
        for (const plugin of client.pluginManager.plugins) {
            const pluginName = plugin.name;
            for (const lang of availableLanguages) {
                const bundle = client.i18n.getResourceBundle(lang, pluginName, true);
                resourceBundle[pluginName] = resourceBundle[pluginName] || {};
                resourceBundle[pluginName][lang] = bundle;
            }
        }

        return resourceBundle;
    },

    SET_LOCALE_BUNDLE: async (client, payload) => {
        const { plugin, language, keys } = payload;
        await client.i18n.updateResourceBundle(plugin, language, keys);

        return true;
    },

    UPDATE_PLUGIN: async (client, payload) => {
        const { pluginName, action, guildId } = payload;

        switch (action) {
            case "enable":
                await client.pluginManager.enablePlugin(pluginName);
                break;

            case "disable":
                await client.pluginManager.disablePlugin(pluginName);
                break;

            case "install":
                await client.pluginManager.installPlugin(pluginName);
                break;

            case "uninstall":
                await client.pluginManager.uninstallPlugin(pluginName);
                break;

            case "guildEnable": {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return null;
                await client.pluginManager.enableInGuild(pluginName, guildId);
                break;
            }

            case "guildDisable": {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return null;
                await client.pluginManager.disableInGuild(pluginName, guildId);
                break;
            }
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return true;
    },
};
