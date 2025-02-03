const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const { DashboardPlugin, PluginConfig } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager {
    /**
     * @type {Map<string, DashboardPlugin>}
     */
    #pluginMap = new Map();

    get plugins() {
        return Array.from(this.#pluginMap.values());
    }

    constructor() {}

    /**
     * @param {string} pluginName
     * @returns {DashboardPlugin} The plugin object for the given plugin.
     */
    getPlugin(pluginName) {
        return this.#pluginMap.get(pluginName);
    }

    /**
     * Loads all plugins in the given directory.
     * @param {string} directory The directory to load plugins from.
     */
    async loadPlugins(directory) {
        // Load core plugin first
        const corePluginPath = join(directory, "core");
        try {
            await this.#loadPlugin(corePluginPath);
        } catch (error) {
            Logger.error(`Error loading plugin ${corePluginPath}:`, error);
            process.exit(1);
        }

        const plugins = readdirSync(directory).filter(
            (f) => statSync(join(directory, f)).isDirectory() && f !== "core",
        );

        // Load all plugins
        for (const plugin of plugins) {
            const pluginPath = join(directory, plugin);
            try {
                await this.#loadPlugin(pluginPath);
            } catch (error) {
                Logger.error(`Error loading plugin ${pluginPath}:`, error);
            }
        }

        Logger.success(`Loaded ${this.plugins.length} plugins`);
    }

    /**
     * Loads a plugin from the given path.
     * @param {string} pluginDir
     */
    async #loadPlugin(pluginDir) {
        // Load config first and sync with database
        const packageJson = require(join(pluginDir, "package.json"));
        if (!packageJson.name || !packageJson.version) {
            throw new Error("Invalid package.json");
        }
        const pluginName = packageJson.name;
        const config = PluginConfig.fromDirectory(pluginDir);
        if (process.env.DEV_MODE !== "1") {
            await PluginConfig.syncWithDb(pluginName, config);
        }

        // Load the bot plugin
        const dashboardEntry = join(pluginDir, "dashboard");
        const plugin = require(dashboardEntry);

        if (!(plugin instanceof DashboardPlugin)) {
            throw new Error("Not a valid plugin (Does it export an instance of the Plugin class?)");
        }

        if (this.#pluginMap.has(plugin.name)) {
            throw new Error(`Plugin name already exists`);
        }

        this.#pluginMap.set(plugin.name, plugin);
        await plugin.load();

        if (plugin.init) {
            plugin.init();
        }
    }
}

module.exports = PluginManager;
