const path = require("node:path");
const { BasePluginManager } = require("strange-core");
const { DBClient } = require("strange-db-client");
const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager extends BasePluginManager {
    /**
     * @param {import('express').Application} app
     * @param {string} registryPath
     * @param {string} pluginDir
     */
    constructor(app, registryPath, pluginDir) {
        super(registryPath, pluginDir);
        this.app = app;
    }

    async enablePlugin(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
        const entry = path.join(pluginDir, "dashboard");

        // Load plugin translations first
        await this.app.i18n.loadPluginTranslations(pluginName);

        const plugin = require(entry);
        if (!(plugin instanceof DashboardPlugin)) {
            throw new Error("Not a valid plugin (Does it export an instance of the Plugin class?)");
        }

        await plugin.enable(DBClient.getInstance());

        // Update the core config
        if (pluginName !== "core") {
            const corePlugin = this.getPlugin("core");
            const config = await corePlugin.getConfig();
            if (!config.ENABLED_PLUGINS.includes(pluginName)) {
                config.ENABLED_PLUGINS.push(pluginName);
                await config.save(config);
            }
        }

        this.setPlugin(pluginName, plugin);
        Logger.success(`Enabled plugin: ${pluginName}`);
    }

    async disablePlugin(pluginName) {
        if (pluginName === "core") {
            throw new Error("Cannot disable core plugin");
        }

        const meta = await this.getPluginsMeta();
        const enabledPlugins = meta.filter((p) => this.isPluginEnabled(p.name)).map((p) => p.name);

        if (!enabledPlugins.includes(pluginName)) {
            Logger.debug(`Plugin ${pluginName} is not enabled.`);
            return;
        }

        // Check if any enabled plugin depends on this one
        const dependentPlugins = enabledPlugins
            .filter((p) => (p.dependencies || []).includes(pluginName))
            .map((p) => p.name);

        if (dependentPlugins.length > 0) {
            throw new Error(
                `Cannot disable ${pluginName}. It is required by: ${dependentPlugins.join(", ")}`,
            );
        }

        const plugin = this.getPlugin(pluginName);
        if (plugin) await plugin.disable();

        // Update the core config
        const corePlugin = this.getPlugin("core");
        const config = await corePlugin.getConfig();

        if (config.ENABLED_PLUGINS.includes(pluginName)) {
            config.ENABLED_PLUGINS = config.ENABLED_PLUGINS.filter((p) => p !== pluginName);
        }
        await config.save(config);

        this.removePlugin(pluginName);
        Logger.success(`Disabled plugin: ${pluginName}`);
    }

    async enableInGuild(pluginName, guildId) {
        const plugin = this.getPlugin(pluginName);
        if (plugin.onGuildEnable) {
            await plugin.onGuildEnable(guildId);
        }

        const core = this.getPlugin("core");
        const settings = await core.getSettings(guildId);
        const enabledPlugins = settings.enabled_plugins || [];

        if (!enabledPlugins.includes(pluginName)) {
            settings.enabled_plugins = [...enabledPlugins, pluginName];
            await settings.save();
        }
    }

    async disableInGuild(pluginName, guildId) {
        if (pluginName === "core") {
            throw new Error("Cannot disable core plugin");
        }

        const plugin = this.getPlugin(pluginName);
        if (plugin.onGuildDisable) {
            await plugin.onGuildDisable(guildId);
        }

        const core = this.getPlugin("core");
        const settings = await core.getSettings(guildId);
        const enabledPlugins = settings.enabled_plugins || [];

        if (enabledPlugins.includes(pluginName)) {
            settings.enabled_plugins = enabledPlugins.filter((p) => p !== pluginName);
            await settings.save();
        }
    }
}

module.exports = PluginManager;
