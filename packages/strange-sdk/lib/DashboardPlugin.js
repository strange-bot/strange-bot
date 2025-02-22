const fs = require("node:fs");
const path = require("node:path");
const { DBClient } = require("strange-db-client");
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
        this.onInit = data.onInit || null;
        this.dashboardRouter = data.dashboardRouter || null;
        this.adminRouter = data.adminRouter || null;
        this.dbService = data.dbService || new DBService(this.name);
        this.config = new Config(this.name, this.pluginDir);
        this.dbClient = null;
        this.schemas = new Map();
        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    async init(dbClient = null) {
        if (dbClient && !(dbClient instanceof DBClient)) {
            throw new TypeError("dbClient must be an instance of DBClient");
        }
        this.dbClient = dbClient;
        await this.config.init(this.dbClient);

        const config = await this.config.get();
        await this.dbService?.init(this.dbClient, config);

        Logger.debug(`Successfully Loaded plugin "${this.name}"`);
    }

    async unload() {
        Logger.debug(`Successfully Unloaded plugin "${this.name}"`);
    }

    async getSettings(guild) {
        return this.dbService?.getSettings(guild) || {};
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

        if (data.onInit && typeof data.onInit !== "function") {
            throw new Error("DashboardPlugin onInit must be a function");
        }

        if (data.dashboardRouter && !data.dashboardRouter.stack) {
            throw new Error(
                "DashboardPlugin dashboardRouter must be an instance of express.Router",
            );
        }
        if (data.adminRouter && !data.adminRouter.stack) {
            throw new Error("DashboardPlugin adminRouter must be an instance of express.Router");
        }

        if (data.dbService && !(data.dbService instanceof DBService)) {
            throw new Error("DashboardPlugin dbService must be an instance of DBService");
        }
    }
}

module.exports = DashboardPlugin;
