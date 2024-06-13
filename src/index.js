require("dotenv").config();

// Load all extenders
require("./extenders/Guild");
require("./extenders/GuildChannel");
require("./extenders/Interaction");
require("./extenders/Message");

const path = require("node:path");

// Initialize the logger
const { Logger } = require("strange-sdk/utils");

const today = new Date();
const logsDir = path.join(__dirname, "..", "logs");
const logsFile = `combined-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile));

// Initialize the client
const BotClient = require("./extenders/BotClient");
const client = new BotClient();

const PluginManager = require("./base/PluginManager");

(async () => {
    // Initialize the database
    const connection = await require("./utils/db").init();

    // Load translations
    await client.loadTranslations();

    // Initialize plugins
    const pluginsDir = path.join(__dirname, "..", "plugins");
    await PluginManager.loadPlugins(client, pluginsDir);

    // Initialize settings
    await require("./base/Settings").init(client);

    // Load all plugin commands and contexts
    client.loadPluginCommands();
    client.loadPluginContexts();

    // Load all plugin events
    PluginManager.listeningEvents.forEach((event) => {
        client.on(event, (...args) => {
            PluginManager.emit(event, ...args);
        });
    });

    // Launch the dashboard
    if (client.coreConfig.get("DASHBOARD").ENABLED) {
        await require("./dashboard/app")(client, connection);
    }

    await client.login(process.env.BOT_TOKEN);
})();

process.on("unhandledRejection", (error) => {
    Logger.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
    Logger.error("Uncaught exception:", error);
});
