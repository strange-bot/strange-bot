const fs = require("node:fs").promises;
const path = require("node:path");
const { BasePluginManager } = require("strange-core");
const { DBClient } = require("strange-db-client");
const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager extends BasePluginManager {
    async enablePlugin(pluginName) {
        if (this._pluginMap.has(pluginName)) {
            throw new Error("Plugin is already enabled.");
        }
        const pluginDir = path.join(this.pluginsDir, pluginName);
        try {
            await fs.stat(pluginDir);
        } catch {
            throw new Error("Plugin is not installed.");
        }
        const dashboardEntry = path.join(pluginDir, "dashboard");
        try {
            await fs.access(dashboardEntry);
        } catch (err) {
            Logger.debug(`Plugin ${pluginDir} does not have a dashboard entry point. Skipping.`);
            return;
        }

        const plugin = require(dashboardEntry);
        if (!(plugin instanceof DashboardPlugin)) {
            throw new Error("Not a valid plugin (Does it export an instance of the Plugin class?)");
        }

        await plugin.init(DBClient.getInstance());
        this._pluginMap.set(plugin.name, plugin);
    }

    async disablePlugin(pluginName) {
        if (!this._pluginMap.has(pluginName)) {
            throw new Error("Plugin is not enabled.");
        }

        const plugin = this._pluginMap.get(pluginName);
        await plugin.destroy();
        this._pluginMap.delete(pluginName);

        const corePlugin = this.getPlugin("core");
        const config = await corePlugin.getConfig();
        config.ENABLED_PLUGINS = config.ENABLED_PLUGINS.filter((p) => p !== pluginName);
        await config.save(config);
    }
}

module.exports = PluginManager;
