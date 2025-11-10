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
    getShard(options = {}) {
        if (options.all) {
            return null;
        }
        if (options.guildId) {
            const shardCount = this.shardManager.totalShards;
            const shardId = ShardClientUtil.shardIdForGuildId(options.guildId, shardCount);
            return shardId;
        }
        if (options.shardId !== undefined) {
            return options.shardId;
        }
        if (options.any) {
            const firstShard = this.shardManager.shards.values().next().value;
            return firstShard ? firstShard.id : null;
        }

        return null;
    }

    isShardAvailable(shardId) {
        if (shardId === null) {
            for (const shard of this.shardManager.shards.values()) {
                if (!shard.ready) return false;
            }
            return true;
        }
        const shard = this.shardManager.shards.get(shardId);
        return shard && shard.ready;
    }

    /**
     * @param {import("veza").NodeMessage} message
     * @param {import("veza").ServerSocket} _socket
     * @returns
     */
    async handleMessage(message, _socket) {
        Logger.debug("[IPC] Received message:", message?.data);
        if (!message?.data?.event) return;

        const { event, payload, options = {} } = message.data;

        let pluginName;
        let eventName;
        const idx = event.indexOf(":");
        if (idx === -1) {
            eventName = event;
        } else {
            pluginName = event.slice(0, idx).trim() || undefined;
            eventName = event.slice(idx + 1).trim();
        }

        const shardId = this.getShard(options);
        if (!this.isShardAvailable(shardId)) {
            return message.reply({
                success: false,
                error: "SHARD_UNAVAILABLE",
            });
        }

        let response;
        if (!pluginName) {
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
                    shard: shardId,
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
                    shard: shardId,
                },
            );
        }

        return message.reply(response);
    }

    async initialize() {
        this.shardManager.shards.forEach((shard) => {
            shard.on("ready", () => {
                Logger.info(`Shard ${shard.id} is ready`);
            });

            shard.on("death", (process) => {
                Logger.warn(`Shard ${shard.id} has died. PID: ${process.pid}`);
            });

            shard.on("disconnect", (event) => {
                Logger.warn(
                    `Shard ${shard.id} disconnected. Code: ${event.code}, Reason: ${event.reason}`,
                );
            });

            shard.on("reconnecting", () => {
                Logger.warn(`Shard ${shard.id} is reconnecting`);
            });

            shard.on("error", (error) => {
                Logger.error(`Shard ${shard.id} encountered an error:`, error);
            });

            shard.on("spawn", (process) => {
                Logger.info(`Shard ${shard.id} spawned. PID: ${process.pid}`);
            });

            shard.on("resume", () => {
                Logger.info(`Shard ${shard.id} resumed.`);
            });
        });

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
