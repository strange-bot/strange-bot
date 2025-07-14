const veza = require("veza");
const { Logger } = require("strange-sdk/utils");
const { languagesMeta } = require("strange-core");
const { ChannelType } = require("discord.js");

class IPCClient {
    /**
     * @param {import('discord.js').Client} discordClient
     */
    constructor(discordClient) {
        if (!discordClient?.shard?.ids?.length) {
            throw new Error("Discord client must be sharded");
        }

        if (!process.env.IPC_SERVER_PORT) {
            throw new Error("IPC_SERVER_PORT environment variable is required");
        }

        this.discordClient = discordClient;
        this.shardId = discordClient.shard.ids[0];
        this.firstConnect = false;
        this.node = this.createNode();
    }

    createNode() {
        return new veza.Client(`Bot #${this.shardId}`, {
            retryTime: 1000,
        })
            .on("error", (error, client) => Logger.error(`[IPC] Error from ${client.name}:`, error))
            .on("disconnect", (client) => Logger.warn(`[IPC] Disconnected from ${client.name}`))
            .on("ready", async (_client) => {
                Logger.success(`[IPC] Shard#${this.shardId} connected`);
            });
    }

    connect() {
        const host = process.env.DOCKER_ENV === "true" ? "dashboard" : "localhost";
        const port = parseInt(process.env.IPC_SERVER_PORT, 10);

        this.node
            .connectTo(port, host)
            .then(() => (this.firstConnect = true))
            .catch((error) => {
                if (error.code == "ECONNREFUSED") return;
                Logger.error("[IPC] Connection failed:", error);
            });
    }

    async #handleBaseMessage(eventName, message) {
        if (eventName === "VALIDATE_GUILD") {
            const guild = this.discordClient.guilds.cache.get(message.data.payload);
            return message.reply({
                success: true,
                data: guild ? true : false,
            });
        }

        if (eventName === "GET_BOT_GUILDS") {
            const guildIds = [...this.discordClient.guilds.cache.keys()];
            return message.reply({
                success: true,
                data: guildIds,
            });
        }

        if (eventName === "GET_GUILD_STATS") {
            const guild = this.discordClient.guilds.cache.get(message.data.payload);
            const data = guild
                ? {
                      channels: {
                          text: guild.channels.cache.filter((c) => c.type === ChannelType.GuildText)
                              .size,
                          voice: guild.channels.cache.filter(
                              (c) => c.type === ChannelType.GuildVoice,
                          ).size,
                      },
                      roles: guild.roles.cache.size,
                      members: guild.memberCount,
                  }
                : null;
            return message.reply({
                success: true,
                data: data,
            });
        }

        if (eventName === "GET_CMDS_SUMMARY") {
            const data = {};
            this.discordClient.pluginManager.plugins.forEach((plugin) => {
                data[plugin.name] = {
                    prefixCount: plugin.prefixCount,
                    slashCount: plugin.slashCount,
                };
            });

            return message.reply({
                success: true,
                data: data,
            });
        }

        if (eventName === "GET_PLUGIN_CMDS") {
            const { pluginName, type } = message.data.payload;

            const data = {};
            if (!type || type === "prefix") {
                const uniqueCommands = new Set();
                const prefixCommands = this.discordClient.commandManager.prefixCommands
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
                            description: this.discordClient.i18n.tr(cmd.description),
                            aliases: cmd.command.aliases,
                        }),
                    );
                data.prefix = prefixCommands;
            }

            if (!type || type === "slash") {
                const uniqueCommands = new Set();
                const slashCommands = this.discordClient.commandManager.slashCommands
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
                            description: this.discordClient.i18n.tr(cmd.description),
                        }),
                    );
                data.slash = slashCommands;
            }

            return message.reply({
                success: true,
                data: data,
            });
        }

        if (eventName === "GET_LOCALE_BUNDLE") {
            const resourceBundle = {};
            const availableLanguages = languagesMeta.map((l) => l.name);
            for (const plugin of this.discordClient.pluginManager.plugins) {
                const pluginName = plugin.name;
                for (const lang of availableLanguages) {
                    const bundle = this.discordClient.i18n.getResourceBundle(
                        lang,
                        pluginName,
                        true,
                    );
                    resourceBundle[pluginName] = resourceBundle[pluginName] || {};
                    resourceBundle[pluginName][lang] = bundle;
                }
            }

            return message.reply({
                success: true,
                data: resourceBundle,
            });
        }

        if (eventName === "SET_LOCALE_BUNDLE") {
            const { plugin, language, keys } = message.data.payload;
            await this.discordClient.i18n.updateResourceBundle(plugin, language, keys);

            return message.reply({
                success: true,
                data: null,
            });
        }

        if (eventName === "UPDATE_PLUGIN") {
            const { pluginName, action, guildId } = message.data.payload;

            switch (action) {
                case "enable":
                    await this.discordClient.pluginManager.enablePlugin(pluginName);
                    break;

                case "disable":
                    await this.discordClient.pluginManager.disablePlugin(pluginName);
                    break;

                case "install":
                    await this.discordClient.pluginManager.installPlugin(pluginName);
                    break;

                case "uninstall":
                    await this.discordClient.pluginManager.uninstallPlugin(pluginName);
                    break;

                case "guildEnable": {
                    const guild = this.discordClient.guilds.cache.get(guildId);
                    if (!guild) return message.reply({ success: true, data: null });
                    await this.discordClient.pluginManager.enableInGuild(pluginName, guildId);
                    break;
                }

                case "guildDisable": {
                    const guild = this.discordClient.guilds.cache.get(guildId);
                    if (!guild) return message.reply({ success: true, data: null });
                    await this.discordClient.pluginManager.disableInGuild(pluginName, guildId);
                    break;
                }
                default:
                    return message.reply({
                        success: false,
                        error: "Invalid action",
                    });
            }

            return message.reply({
                success: true,
                data: null,
            });
        }
    }

    async handleMessage(message) {
        if (!message?.data?.event) {
            return;
        }

        const { event, payload } = message.data;
        const [pluginName, eventName] = event.split(":");

        if (!pluginName || !eventName) {
            return message.reply({ success: false, error: "Invalid event format" });
        }

        if (pluginName === "dashboard") {
            return this.#handleBaseMessage(eventName, message);
        }

        const plugin = this.discordClient.pluginManager.getPlugin(pluginName);
        if (!plugin?.ipcEvents?.has(eventName)) {
            return message.reply({ success: false, error: "Handler not found" });
        }

        try {
            const handler = plugin.ipcEvents.get(eventName);
            const data = await handler(payload, this.discordClient);
            return message.reply({
                success: true,
                data: data,
            });
        } catch (error) {
            Logger.error(`Error in plugin ${pluginName} IPC handler: ${error.message}`, error);
            return message.reply({
                success: false,
                error: error.message,
            });
        }
    }

    initialize() {
        this.node.on("message", this.handleMessage.bind(this));

        setInterval(() => {
            if (!this.firstConnect) this.connect();
        }, 1000);

        this.connect();
        return this.node;
    }
}

module.exports = IPCClient;
