const fs = require("node:fs");
const path = require("node:path");
const { Logger } = require("./utils");
const Config = require("./Config");
const DBService = require("./DBService");

class DashboardPlugin {
    constructor(data) {
        Logger.debug("Initializing plugin", data);
        DashboardPlugin.#validate(data);
        this.pluginDir = path.join(data.baseDir, "..");
        const packageJson = require(path.join(this.pluginDir, "package.json"));
        this.name = packageJson.name;
        this.version = packageJson.version;

        this.baseDir = data.baseDir;
        this.ownerOnly = data.ownerOnly || false;
        this.icon = data.icon || "fa-solid fa-puzzle-piece";
        this.dashboardRouter = data.dashboardRouter || null;
        this.adminRouter = data.adminRouter || null;
        this.dbService = null;

        // If a db.service.js exists next to config.json (pluginDir), load it automatically
        try {
            if (!this.dbService) {
                const dbServicePath = path.join(this.pluginDir, "db.service.js");
                if (fs.existsSync(dbServicePath)) {
                    const raw = require(dbServicePath);
                    const PluginExport = raw && raw.default ? raw.default : raw;

                    // If it's a class whose prototype extends DBService, instantiate it
                    if (
                        PluginExport &&
                        PluginExport.prototype &&
                        PluginExport.prototype instanceof DBService
                    ) {
                        this.dbService = new PluginExport(this.pluginDir);
                    } else if (
                        PluginExport &&
                        typeof PluginExport === "object" &&
                        PluginExport instanceof DBService
                    ) {
                        // Already an instance
                        this.dbService = PluginExport;
                    } else {
                        throw new Error(
                            "db.service.js must export a class extending DBService or an instance of DBService",
                        );
                    }
                }
            }
        } catch (error) {
            Logger.error(
                `Failed to load db.service for plugin ${this.name}: ${error.message}`,
                error,
            );
            throw error;
        }

        this.onEnable = data.onEnable || null;
        this.onDisable = data.onDisable || null;
        this.onGuildEnable = data.onGuildEnable || null;
        this.onGuildDisable = data.onGuildDisable || null;

        this.config = new Config(this.name, this.pluginDir);
        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    async enable(dbClient) {
        if (!dbClient) throw new TypeError("dbClient must be an instance of DBClient");
        await this.config.init(dbClient);
        const config = await this.config.get();
        await this.dbService?.init(dbClient, config);
        if (this.onEnable) {
            await this.onEnable();
        }
    }

    async disable() {
        await this.dbService?.destroy();
        if (this.onDisable) {
            await this.onDisable();
        }
    }

    async getConfig() {
        return await this.config.get();
    }

    static #validate(data) {
        if (typeof data !== "object") {
            throw new TypeError("DashboardPlugin data must be an Object.");
        }

        if (!data.baseDir || typeof data.baseDir !== "string") {
            throw new Error("DashboardPlugin baseDir must be a string");
        }

        if (!fs.existsSync(data.baseDir)) {
            throw new Error("DashboardPlugin baseDir does not exist");
        }

        const packageJsonPath = path.join(data.baseDir, "../package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error("No package.json found in plugin directory");
        }

        if (Object.prototype.hasOwnProperty.call(data, "ownerOnly")) {
            if (typeof data.ownerOnly !== "boolean") {
                throw new Error("DashboardPlugin ownerOnly must be a boolean");
            }
        }

        if (data.icon && typeof data.icon !== "string") {
            throw new Error("DashboardPlugin icon must be a string");
        }

        if (data.onEnable && typeof data.onEnable !== "function") {
            throw new Error("DashboardPlugin onEnable must be a function");
        }

        if (data.onDisable && typeof data.onDisable !== "function") {
            throw new Error("DashboardPlugin onDisable must be a function");
        }

        if (data.onGuildEnable && typeof data.onGuildEnable !== "function") {
            throw new Error("DashboardPlugin onGuildEnable must be a function");
        }

        if (data.onGuildDisable && typeof data.onGuildDisable !== "function") {
            throw new Error("DashboardPlugin onGuildDisable must be a function");
        }

        if (data.dashboardRouter && !data.dashboardRouter.stack) {
            throw new Error(
                "DashboardPlugin dashboardRouter must be an instance of express.Router",
            );
        }
        if (data.adminRouter && !data.adminRouter.stack) {
            throw new Error("DashboardPlugin adminRouter must be an instance of express.Router");
        }
    }
}

module.exports = DashboardPlugin;
