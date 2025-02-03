const express = require("express");
const path = require("node:path");
const DBClient = require("strange-db-client");
const MongoStore = require("connect-mongo");
const { Logger } = require("strange-sdk/utils");
const PluginManager = require("./helpers/PluginManager");

// Middlewares
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const { baseContext } = require("./middlewares/context.middleware");
const { CheckAuth } = require("./middlewares/auth.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

// Routers
const authRouter = require("./routes/auth.router");
const dashboardRouter = require("./routes/dashboard.router");

module.exports = class App {
    /**
     * @param {import('veza').Server} ipcServer
     */
    constructor(ipcServer) {
        this.app = express();

        // Set app properties
        this.app.ipcServer = ipcServer;
        this.app.pluginManager = new PluginManager();
        this.app.i18n = null;
        this.app.translations = null;

        this.#initializeMiddlewares();
        this.#initializeRoutes();
        this.#initializeViewEngine();
        this.#initializeErrorHandling();
    }

    async loadTranslations(baseDir, pluginsDir) {
        const I18nManager = require("strange-i18n");
        this.app.i18n = new I18nManager("dashboard", {
            baseDir,
            pluginsDir,
            fallbackLng: "en-US",
        });

        this.app.translations = await this.app.i18n.initialize();
        Logger.success("Loaded translations");
    }

    async loadPlugins(pluginsDir) {
        await this.app.pluginManager.loadPlugins(pluginsDir);
    }

    listen(port) {
        this.app.listen(port, () => {
            Logger.success(`Dashboard is running on port ${port}`);
        });
    }

    getServer() {
        return this.app;
    }

    #initializeMiddlewares() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(expressLayouts);
        this.app.use(express.static(path.join(__dirname, "/public")));
        this.app.use(
            session({
                secret: process.env.SESSION_SECRET,
                cookie: { maxAge: 336 * 60 * 60 * 1000 },
                name: process.env.SESSION_COOKIE,
                resave: true,
                saveUninitialized: false,
                store: MongoStore.create({
                    client: DBClient.getInstance().getMongoClient(),
                    dbName: DBClient.getInstance().getDatabaseName(),
                    collectionName: "sessions",
                    stringify: false,
                    autoRemove: "interval",
                }),
            }),
        );
        this.app.use(baseContext);
    }

    #initializeRoutes() {
        this.app.use("/auth", authRouter);
        this.app.use("/dashboard", CheckAuth, dashboardRouter);
    }

    #initializeViewEngine() {
        this.app.set("views", path.join(__dirname, "views"));
        this.app.set("layout", "./layouts/dashboard");
        this.app.set("view engine", "ejs");
        this.app.engine("html", require("ejs").renderFile);
    }

    #initializeErrorHandling() {
        this.app.use(errorMiddleware);
        this.app.use("*", (_req, res) => {
            res.status(404).send({
                success: false,
                code: 404,
                message: "404 Not Found. Visit /docs for more information",
            });
        });
    }
};
