// Load all extenders
require("./extenders/Guild");
require("./extenders/Interaction");
require("./extenders/Message");

require("dotenv").config();
const path = require("node:path");
const { Logger } = require("strange-sdk/utils");
const BotClient = require("./extenders/BotClient");
const IPCClient = require("./helpers/IPCClient");
const DatabaseClient = require("strange-db-client");

// Setup Directories
const logsDir = path.join(__dirname, "..", "..", "logs");
const localesDir = path.join(__dirname, "locales");
const pluginsDir = path.join(__dirname, "..", "..", "plugins");

// Create a Discord & IPC Client
const client = new BotClient();
const ipcClient = new IPCClient(client);

// Initialize the logger
const today = new Date();
const logsFile = `bot-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile), { shard: client.shard.ids[0] });

(async () => {
    // Initialize Database connection
    const db = new DatabaseClient({
        mongoUri: process.env.MONGO_URI,
        redisUri: process.env.REDIS_URL,
    });
    await db.connect().catch((err) => {
        Logger.error("Error connecting to database:", err);
        process.exit(1);
    });
    Logger.success("Connected to database");

    // Initialize translations
    await client.loadTranslations(localesDir, pluginsDir);

    // Initialize plugins
    await client.pluginManager.loadPlugins(pluginsDir);

    // Load all plugin commands and contexts
    client.loadPluginCommands();
    client.loadPluginContexts();

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
