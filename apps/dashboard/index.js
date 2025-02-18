require("dotenv").config();
const path = require("node:path");
const { Logger } = require("strange-sdk/utils");

// Setup Directories
const logsDir = path.join(__dirname, "..", "..", "logs");
const localesDir = path.join(__dirname, "locales");
const pluginsDir = path.join(__dirname, "..", "..", "plugins");

// Initialize the logger
const today = new Date();
const logsFile = `dashboard-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile));

const { DBClient } = require("strange-db-client");
const App = require("./app");
const IPCServer = require("./helpers/IPCServer");

(async () => {
    // Initialize Database connection
    const dbClient = new DBClient({
        mongoUri: process.env.MONGO_URI,
        redisUri: process.env.REDIS_URL,
    });
    await dbClient.connect().catch((err) => {
        Logger.error("Error connecting to database:", err);
        process.exit(1);
    });
    Logger.success("Connected to database");

    // Register Models
    dbClient.registerSchema("configs", require("./schemas/Config"));
    dbClient.registerSchema("dashboard", require("./schemas/Dashboard"));

    // Initialize IPC Server
    const ipcServer = new IPCServer();
    await ipcServer.initialize();

    // Initialize the Express App
    const app = new App(dbClient, ipcServer);
    app.loadTranslations(localesDir, pluginsDir);
    app.loadPlugins(pluginsDir);
    app.listen(process.env.DASHBOARD_PORT);
})();
