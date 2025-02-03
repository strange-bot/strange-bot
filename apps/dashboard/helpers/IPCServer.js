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

    async broadcast(event, data) {
        const results = await Promise.all(
            this.getSockets().map((s) =>
                s[1].send(
                    {
                        event,
                        payload: data,
                    },
                    { receptive: true },
                ),
            ),
        );
        return results.flat();
    }

    async initialize() {
        this.server.on("connect", (client) => {
            Logger.success(`[IPC] Client connected: ${client.name}`);
        });

        this.server.on("disconnect", (client) => {
            Logger.info(`[IPC] Client disconnected: ${client.name}`);
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
