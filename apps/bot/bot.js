// Load all extenders
require("./extenders/Guild");
require("./extenders/Interaction");
require("./extenders/Message");

require("dotenv").config();
const path = require("node:path");
const { Logger } = require("strange-sdk/utils");
const BotClient = require("./extenders/BotClient");
const IPCClient = require("./helpers/IPCClient");
const { DBClient } = require("strange-db-client");

// Setup Directories
const logsDir = path.join(__dirname, "..", "..", "logs");

// Create a Discord & IPC Client
const client = new BotClient();
const ipcClient = new IPCClient(client);

// Initialize the logger
const today = new Date();
const logsFile = `bot-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile), { shard: client.shard.ids[0] });

(async () => {
    // Initialize Database connection
    const db = new DBClient({
        mongoUri: process.env.MONGO_URI,
        redisUri: process.env.REDIS_URL,
    });
    await db.connect().catch((err) => {
        Logger.error("Error connecting to database:", err);
        process.exit(1);
    });
    Logger.success("Connected to database");

    // Register models
    const ConfigSchema = require("./schemas/Config");
    db.registerSchema("configs", ConfigSchema);

    // Initialize translations
    await client.i18n.initialize();

    // Initialize plugins
    await client.pluginManager.init();

    // Load all plugin events
    client.pluginManager.listeningEvents.forEach((event) => {
        client.on(event, (...args) => {
            if (event === "ready") {
                ipcClient.initialize(client);
            }

            client.pluginManager.emit(event, ...args);
        });
    });

    await client.login(process.env.BOT_TOKEN);
})();

process.on("unhandledRejection", (err) => {
    Logger.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    Logger.error("Uncaught Exception:", err);
});
