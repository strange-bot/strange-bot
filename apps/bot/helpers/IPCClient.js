const veza = require("veza");
const { Logger } = require("strange-sdk/utils");
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
        this.node
            .connectTo(process.env.IPC_SERVER_PORT)
            .then(() => (this.firstConnect = true))
            .catch((error) => {
                if (error.message.includes("ECONNREFUSED")) return;
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

        if (eventName === "GET_PLUGIN_CMDS") {
            const { guildId, pluginName } = message.data.payload;
            const guild = this.discordClient.guilds.cache.has(guildId);
            message.reply({
                success: true,
                data: guild
                    ? this.discordClient.prefixCommands
                          .filter((cmd) => cmd.plugin?.name === pluginName)
                          .map((cmd) =>
                              structuredClone({
                                  name: cmd.name,
                                  description: cmd.description,
                                  command: cmd.command,
                                  slashCommand: cmd.slashCommand,
                              }),
                          )
                    : null,
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
        if (!plugin?.ipcHandler?.[eventName]) {
            return message.reply({ success: false, error: "Handler not found" });
        }

        try {
            const data = await plugin.ipc.handler[eventName](payload, this.discordClient);
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
