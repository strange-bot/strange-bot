require("dotenv").config();
const path = require("node:path");
const { Logger } = require("strange-sdk/utils");

// Setup Directories
const logsDir = path.join(__dirname, "..", "..", "logs");

// Initialize the logger
const today = new Date();
const logsFile = `dashboard-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile));

const { DBClient } = require("strange-db-client");
const db = require("./db.service");
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
    await db.init(dbClient);

    // Initialize IPC Server
    const ipcServer = new IPCServer();
    await ipcServer.initialize();

    // Initialize the Express App
    const app = new App(ipcServer);
    app.loadTranslations();
    app.loadPlugins();
    app.listen(process.env.DASHBOARD_PORT);
})();

process.on("unhandledRejection", (err) => {
    Logger.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    Logger.error("Uncaught Exception:", err);
});
