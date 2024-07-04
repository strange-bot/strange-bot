const { join } = require("node:path");
const { Logger } = require("./utils");

module.exports = class Config {
    constructor(baseDir, data) {
        Logger.debug("Initializing config", data);
        Config.#validate(baseDir, data);
        const packageJson = require(join(baseDir, "package.json"));
        this.pluginName = packageJson.name;
        this.pluginVersion = packageJson.version;
        this.model = null;
        this.data = data;
        Logger.debug("Config initialized");
    }

    async loadFromDb(model) {
        Logger.debug("Loading config from database", this.pluginName);
        this.model = model;
        const doc = await model.findOne({ _id: this.pluginName }).lean();
        if (doc) {
            Object.assign(this.data, doc.config);
        } else {
            await model.create({
                _id: this.pluginName,
                config: this.data,
            });
        }
        Logger.debug("Config loaded from database", this.pluginName);
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
    }

    async saveToDb() {
        if (this.model) {
            await this.model.updateOne({ _id: this.pluginName }, { config: this.data });
        }
    }

    static #validate(baseDir, data) {
        if (!baseDir) {
            throw new Error("Config directory name is required.");
        }

        const fs = require("fs");
        if (!fs.existsSync(baseDir)) {
            throw new Error("Config baseDir does not exist");
        }

        const packageJsonPath = join(baseDir, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error("No package.json found in config directory");
        }

        if (typeof data !== "object") {
            throw new TypeError("Config data must be an Object.");
        }
    }
};
