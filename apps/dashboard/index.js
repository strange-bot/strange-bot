require("dotenv").config();
const path = require("node:path");
const { Logger } = require("nexord-sdk/utils");

// Setup Directories
const logsDir = path.join(__dirname, "..", "..", "logs");

// Initialize the logger
const today = new Date();
const logsFile = `dashboard-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
Logger.init(path.join(logsDir, logsFile));

const { DBClient } = require("nexord-db-client");
const db = require("./db.service");
const App = require("./app");
const IPCClient = require("./helpers/IPCClient");

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

    // Initialize IPC Client
    const ipcClient = new IPCClient();
    ipcClient.initialize();

    // Initialize the Express App
    const app = new App(ipcClient, dbClient);
    app.loadTranslations();
    app.loadPlugins();
    app.listen(process.env.DASHBOARD_PORT);
})();

// console.error here so a broken logger/worker can't cause recursive crashes
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    Logger.captureException(err, {
        tags: { handler: "unhandledRejection" },
    });
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    Logger.captureException(err, {
        tags: { handler: "uncaughtException" },
    });
});
