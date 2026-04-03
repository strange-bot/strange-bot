const veza = require("veza");
const { Logger } = require("nexord-sdk/utils");

class IPCClient {
    constructor() {
        this.node = new veza.Client("Dashboard", { retryTime: 1000 });
        this.port = process.env.IPC_SERVER_PORT;
        this.firstConnect = false;
    }

    connect() {
        const host = process.env.DOCKER_ENV === "true" ? "bot" : "localhost";
        const port = parseInt(this.port, 10);

        this.node
            .connectTo(port, host)
            .then(() => (this.firstConnect = true))
            .catch((error) => {
                if (error.code == "ECONNREFUSED") return;
                Logger.error("[IPC] Connection failed:", error);
            });
    }

    initialize() {
        this.node.on("error", (error, client) =>
            Logger.error(`[IPC] Error from ${client.name}:`, error),
        );
        this.node.on("disconnect", (client) =>
            Logger.warn(`[IPC] Disconnected from ${client.name}`),
        );
        this.node.on("ready", async (client) => {
            Logger.success(`[IPC] Connected to ${client.name}`);
        });

        setInterval(() => {
            if (!this.firstConnect) this.connect();
        }, 1000);

        this.connect();
    }

    /**
     * Broadcast to all shards
     * @param {string} eventName
     * @param {*} data
     * @param {object} options
     * @returns
     */
    async broadcast(eventName, data, options = {}) {
        const response = await this._send(
            {
                event: eventName,
                options: { all: true, ...options },
                payload: data,
            },
            options,
        );

        if (Array.isArray(response)) {
            return response;
        }

        return [
            {
                success: false,
                data: null,
            },
        ];
    }

    /**
     * Broadcast to one shard
     * @param {string} event
     * @param {*} data
     * @param {object} options
     * @returns
     */
    async broadcastOne(event, data, options = {}) {
        if (!options.guildId && !options.shardId && !options.any) {
            throw new Error(
                "broadcastOne: Either guildId, shardId, or any=true must be provided in options",
            );
        }
        return await this._send(
            {
                event,
                options,
                payload: data,
            },
            options,
        );
    }

    async _send(data, options = {}) {
        if (!this.firstConnect) {
            Logger.warn("[IPC] Not connected to BotShardManager");
            return { success: false, data: null };
        }
        Logger.debug(`[IPC] Sending event '${data.event}'`);
        const receptive = options.receptive ?? true;
        const startTime = Date.now();
        try {
            const response = await this.node.sendTo("BotShardManager", data, { receptive });
            const endTime = Date.now();
            Logger.debug(`[IPC] Send '${data.event}' completed in ${endTime - startTime}ms`);
            return response;
        } catch (error) {
            const endTime = Date.now();
            Logger.error(
                `[IPC] Send '${data.event}' failed after ${endTime - startTime}ms:`,
                error,
            );
            return { success: false, data: null };
        }
    }
}

module.exports = IPCClient;
