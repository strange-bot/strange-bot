const { Server, ServerStatus } = require("veza");
const { Logger } = require("strange-sdk/utils");
const { ShardClientUtil } = require("discord.js");

class IPCServer {
    /**
     * @param {import('discord.js').ShardingManager} shardManager
     */
    constructor(shardManager) {
        if (!process.env.IPC_SERVER_PORT) {
            throw new Error("IPC_SERVER_PORT environment variable is required");
        }
        this.shardManager = shardManager;
        this.server = new Server("BotShardManager");
        this.port = process.env.IPC_SERVER_PORT;
    }

    /**
     * Helper to get shard processes based on targetOptions
     * @returns {number}
     */
    getShard(targetOptions = {}) {
        if (targetOptions.all) {
            return null;
        }
        if (targetOptions.guildId) {
            const shardCount = this.shardManager.totalShards;
            const shardId = ShardClientUtil.shardIdForGuildId(targetOptions.guildId, shardCount);
            return shardId;
        }
        if (targetOptions.shardId !== undefined) {
            return targetOptions.shardId;
        }
        if (targetOptions.any) {
            const firstShard = this.shardManager.shards.values().next().value;
            return firstShard ? firstShard.id : null;
        }

        // Default: first shard
        const firstShard = this.shardManager.shards.values().next().value;
        return firstShard ? firstShard.id : null;
    }

    /**
     * @param {import("veza").NodeMessage} message
     * @param {import("veza").ServerSocket} _socket
     * @returns
     */
    async handleMessage(message, _socket) {
        Logger.debug("[IPC] Received message:", message?.data);
        if (!message?.data?.event) return;

        const { event, payload, targetOptions = {} } = message.data;
        const [pluginName, eventName] = event.split(":");
        let response;

        if (pluginName === "dashboard") {
            response = await this.shardManager.broadcastEval(
                async (c, args) => {
                    try {
                        const { eventName, payload } = args;
                        if (typeof c.ipcHandlers[eventName] !== "function") {
                            return;
                        }
                        const response = await c.ipcHandlers[eventName](c, payload);
                        return { success: true, data: response };
                    } catch (error) {
                        c.logger.error("[IPC] Error handling event", error);
                        return { success: false, error: error.message };
                    }
                },
                {
                    context: {
                        eventName,
                        payload,
                    },
                    shard: this.getShard(targetOptions),
                },
            );
        } else {
            response = await this.shardManager.broadcastEval(
                async (c, args) => {
                    try {
                        const { pluginName, eventName, payload } = args;
                        const plugin = c.pluginManager.getPlugin(pluginName);
                        if (!plugin || !plugin?.ipcEvents?.has(eventName)) {
                            return;
                        }

                        const handler = plugin.ipcEvents.get(eventName);
                        const response = await handler.call(plugin, c, payload);
                        return { success: true, data: response };
                    } catch (error) {
                        c.logger.error("[IPC] Error handling event", error);
                        return { success: false, error: error.message };
                    }
                },
                {
                    context: {
                        pluginName,
                        eventName,
                        payload,
                    },
                    shard: this.getShard(targetOptions),
                },
            );
        }

        return message.reply(response);
    }

    async initialize() {
        this.server.on("connect", (client) => {
            Logger.success(`[IPC] Client connected: ${client.name}`);
        });

        this.server.on("disconnect", (client) => {
            Logger.warn(`[IPC] Client disconnected: ${client.name}`);
        });

        this.server.on("error", (error, client) => {
            Logger.error(`[IPC] Client error: ${client?.name ?? "unknown"}`, error);
        });

        this.server.on("message", this.handleMessage.bind(this));

        await this.server.listen(this.port);
        Logger.success(`[IPC] Server listening on port ${this.port}`);

        this.startHealthCheck();
        return this.server;
    }

    startHealthCheck() {
        setInterval(() => {
            if (this.server.status != ServerStatus.Opened) {
                this.server.listen(this.port).catch((ex) => {
                    Logger.error("[IPC] Server error", ex);
                });
            }
        }, 1000 * 10);
    }
}

module.exports = IPCServer;
