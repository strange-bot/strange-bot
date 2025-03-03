const { Server, ServerStatus } = require("veza");
const { Logger } = require("strange-sdk/utils");

class IPCServer {
    constructor() {
        this.server = new Server("Dashboard");
        this.port = process.env.IPC_SERVER_PORT;
    }

    getSockets() {
        return Array.from(this.server.sockets).filter((c) => /\d+$/.test(c[0]));
    }

    async broadcast(event, data, receptive = true) {
        const startTime = Date.now();
        Logger.debug(`[IPC] Broadcasting event '${event}' to all sockets`);

        try {
            const sockets = this.getSockets();
            if (!sockets.length) {
                Logger.warn("[IPC] No available sockets for broadcast");
                return [];
            }

            const results = await Promise.allSettled(
                sockets.map((s) =>
                    s[1]
                        .send(
                            {
                                event,
                                payload: data,
                            },
                            { receptive },
                        )
                        .catch((error) => {
                            Logger.error(
                                `[IPC] Failed to send message to socket ${s[0]}: ${error.message}`,
                            );
                            return null;
                        }),
                ),
            );

            const endTime = Date.now();
            Logger.debug(`[IPC] Broadcast '${event}' completed in ${endTime - startTime}ms`);

            return results
                .filter((r) => r.status === "fulfilled" && r.value !== null)
                .map((r) => r.value)
                .flat();
        } catch (error) {
            const endTime = Date.now();
            Logger.error(`[IPC] Broadcast error (took ${endTime - startTime}ms):`, error);
            return [];
        }
    }

    async broadcastOne(event, data, receptive = true) {
        const startTime = Date.now();
        Logger.debug(`[IPC] Broadcasting event '${event}' to one socket`);

        try {
            const sockets = this.getSockets();
            if (!sockets.length) {
                Logger.warn("[IPC] No available sockets for broadcast");
                return { success: false, data: null };
            }

            const result = await sockets[0][1]
                .send(
                    {
                        event,
                        payload: data,
                    },
                    { receptive },
                )
                .catch((error) => {
                    Logger.error(`[IPC] Failed to send message to socket: ${error.message}`);
                    return { success: false, data: null };
                });

            const endTime = Date.now();
            Logger.debug(`[IPC] BroadcastOne '${event}' completed in ${endTime - startTime}ms`);

            return result;
        } catch (error) {
            const endTime = Date.now();
            Logger.error(`[IPC] BroadcastOne error (took ${endTime - startTime}ms):`, error);
            return { success: false, data: null };
        }
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
