const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { Logger } = require("strange-sdk/utils");
const PluginManager = require("./helpers/PluginManager");
const { I18nManager } = require("strange-core");

// Middlewares
const expressLayouts = require("express-ejs-layouts");
const sessionMiddleware = require("./middlewares/session.middleware");
const baseMiddleware = require("./middlewares/context/base.middleware");
const { CheckAuth, CheckAdmin } = require("./middlewares/auth.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

// Routers
const landingRouter = require("./routes/landing.router");
const authRouter = require("./routes/auth.router");
const dashboardRouter = require("./routes/dashboard.router");
const adminRouter = require("./routes/admin.router");
const apiRouter = require("./routes/api.router");

module.exports = class App {
    constructor(ipcServer) {
        this.app = express();

        // Set app properties
        this.app.ipcServer = ipcServer;
        this.app.logger = Logger;

        this.app.pluginManager = new PluginManager(
            this.app,
            process.env.REGISTRY_PATH,
            process.env.PLUGINS_DIR,
        );

        const baseDir = path.join(__dirname, "locales");
        this.app.i18n = new I18nManager("dashboard", {
            baseDir,
            pluginsDir: process.env.PLUGINS_DIR,
            fallbackLng: "en-US",
        });
        this.app.translations = new Map();

        this.#initializeMiddlewares();
        this.#initializeRoutes();
        this.#initializeViewEngine();
        this.#initializeErrorHandling();
    }

    async loadTranslations() {
        this.app.translations = await this.app.i18n.initialize();
        Logger.success("Loaded translations");
    }

    async loadPlugins() {
        await this.app.pluginManager.init();
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
        this.app.use(sessionMiddleware());
        this.app.use(baseMiddleware);
    }

    #initializeRoutes() {
        this.app.get("/", landingRouter);
        this.app.use("/auth", authRouter);
        this.app.use("/dashboard", CheckAuth, dashboardRouter);
        this.app.use("/admin", CheckAdmin, adminRouter);
        this.app.use("/api", CheckAuth, apiRouter);
    }

    #initializeViewEngine() {
        this.app.set("views", path.join(__dirname, "views"));
        this.app.locals.includePartial = function (filename, data = {}) {
            const ejs = require("ejs");
            const filePath = path.join(__dirname, "views", "shared", filename + ".ejs");
            const template = fs.readFileSync(filePath, "utf8");
            return ejs.render(template, { ...this, ...data });
        };
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
