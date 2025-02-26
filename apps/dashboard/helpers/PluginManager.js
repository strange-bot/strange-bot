const fs = require("node:fs").promises;
const path = require("node:path");
const { BasePluginManager } = require("strange-core");
const { DBClient } = require("strange-db-client");
const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager extends BasePluginManager {
    async onEnable(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
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
        return plugin;
    }

    async onDisable(pluginName) {
        const plugin = this.getPlugin(pluginName);
        await plugin.destroy?.();
    }
}

module.exports = PluginManager;
