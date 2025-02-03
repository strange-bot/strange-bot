const veza = require("veza");
const { Logger } = require("strange-sdk/utils");

class IPCClient {
    /**
     * 
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
            .on("ready", async (client) => {
                Logger.success(`[IPC] Shard#${this.shardId} connected to ${client.name}`);
            });
    }

    connect() {
        this.node.connectTo(process.env.IPC_SERVER_PORT)
            .then(() => (this.firstConnect = true))
            .catch((error) => {
                if (error.message.includes("ECONNREFUSED")) return;
                Logger.error("[IPC] Connection failed:", error);
            });
    }

    async handleMessage(message) {
        if (!message?.data?.event) {
            return message.reply({ success: false, error: "Invalid message format" });
        }

        const { event, payload } = message.data;
        const [pluginName, eventName] = event.split(":");

        if (!pluginName || !eventName) {
            return message.reply({ success: false, error: "Invalid event format" });
        }

        const plugin = this.discordClient.pluginManager.getPlugin(pluginName);
        if (!plugin?.ipc?.handler?.[eventName]) {
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