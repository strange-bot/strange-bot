const { BasePluginManager } = require("nexord-core");
const path = require("node:path");
const { DBClient } = require("nexord-db-client");
const { BotPlugin } = require("nexord-sdk");
const { Logger } = require("nexord-sdk/utils");

class PluginManager extends BasePluginManager {
    #listeningEvents = new Set();
    #debug = process.env.DEBUG_PLUGIN_LISTENERS === "true";

    /**
     * @param {import('discord.js').Client} client
     * @param {string} registryPath
     * @param {string} pluginDir
     */
    constructor(client, registryPath, pluginDir) {
        super(registryPath, pluginDir);
        this.client = client;
    }

    get listeningEvents() {
        return this.#listeningEvents;
    }

    /**
     * Get current Discord.js listener counts for all events
     * Used to detect listener leaks
     */
    #getListenerCounts() {
        const events = [
            'ready', 'messageCreate', 'interactionCreate', 'guildMemberAdd',
            'guildMemberRemove', 'guildCreate', 'guildDelete', 'guildUpdate',
            'roleCreate', 'roleDelete', 'roleUpdate', 'channelCreate',
            'channelDelete', 'channelUpdate', 'inviteCreate', 'inviteDelete'
        ];

        const counts = {};
        for (const event of events) {
            counts[event] = this.client.listenerCount(event);
        }
        return counts;
    }

    async postInstall(_pluginName, _targetPath, _meta) {}

    async preUninstall(pluginName) {
        // Flush all cached data related to this plugin from Redis
        try {
            await DBClient.getInstance().flushKeys(`${pluginName}:*`);
            Logger.debug(`Flushed cache keys for plugin ${pluginName}`);
        } catch (error) {
            Logger.warn(`Failed to flush cache for plugin ${pluginName}:`, error.message);
        }
    }

    async enablePlugin(pluginName) {
        if (this.isPluginEnabled(pluginName)) {
            throw new Error(`Plugin ${pluginName} is already enabled.`);
        }

        const pluginDir = path.join(this.pluginsDir, pluginName);
        const entry = path.join(pluginDir, "bot");

        try {
            // Load plugin translations first
            await this.client.i18n.loadPluginTranslations(pluginName);

            const plugin = require(entry);
            if (!(plugin instanceof BotPlugin)) {
                throw new Error(
                    "Not a valid plugin (Does it export an instance of the BotPlugin class?)",
                );
            }

            await plugin.enable(this.client, DBClient.getInstance());

            // Register commands
            if (plugin.commands.size > 0) {
                this.client.commandManager.registerPlugin(plugin);
            }

            // Register event handlers
            if (plugin.eventHandlers.size > 0) {
                plugin.eventHandlers.forEach((_, key) => {
                    if (!this.#listeningEvents.has(key)) {
                        this.#listeningEvents.add(key);
                    }
                });
            }

            // Update all guild commands to reflect the enabled plugin
            await this.client.commandManager.updatePluginStatus(pluginName, true);

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
        } catch (error) {
            if (error.code === "MODULE_NOT_FOUND") {
                Logger.debug(`Plugin ${pluginDir} does not have a bot entry point. Skipping.`);
                return;
            }
            Logger.error(`Error enabling plugin ${pluginName}:`, error);
        }
    }

    async disablePlugin(pluginName) {
        // other checks & config update is handled in dashboard PluginManager

        const plugin = this.getPlugin(pluginName);
        const pluginDir = path.join(this.pluginsDir, pluginName);
        const entry = path.join(pluginDir, "bot");

        // Track listener counts before disable (for leak detection)
        const listenersBefore = this.#getListenerCounts();

        // Update event handlers
        plugin.eventHandlers.forEach((_, event) => {
            let isEventUsed = false;
            for (const p of this.plugins) {
                if (p.name !== pluginName && p.eventHandlers.has(event)) {
                    isEventUsed = true;
                    break;
                }
            }
            if (!isEventUsed) {
                this.#listeningEvents.delete(event);
            }
        });

        // Remove plugin translations
        this.client.i18n.removePluginTranslations(pluginName);

        // Update all guild commands to reflect the disabled plugin
        if (plugin.commands.size > 0) {
            this.client.commandManager.unregisterPlugin(plugin);
        }

        await this.client.commandManager.updatePluginStatus(pluginName, false);
        await plugin.disable(this.client);

        // Track listener counts after disable (for leak detection)
        const listenersAfter = this.#getListenerCounts();

        // Check for listener leaks
        let leaksDetected = false;
        const leakDetails = {};
        for (const [event, countAfter] of Object.entries(listenersAfter)) {
            const countBefore = listenersBefore[event];
            if (countAfter > countBefore) {
                leaksDetected = true;
                leakDetails[event] = { before: countBefore, after: countAfter, diff: countAfter - countBefore };
            }
        }

        if (leaksDetected) {
            Logger.warn(
                `⚠️  Discord.js listener leak detected in plugin ${pluginName}:`,
                leakDetails
            );
        } else if (this.#debug) {
            Logger.debug(`No listener leaks detected for plugin ${pluginName}`, {
                before: listenersBefore,
                after: listenersAfter
            });
        }

        // Clear require cache to prevent memory leaks and stale code references
        try {
            delete require.cache[require.resolve(entry)];
            // Also clear any child modules loaded by this plugin
            Object.keys(require.cache).forEach(key => {
                if (key.includes(pluginDir)) {
                    delete require.cache[key];
                }
            });
            Logger.debug(`Cleared require cache for plugin ${pluginName}`);
        } catch (error) {
            Logger.warn(`Failed to clear require cache for ${pluginName}:`, error.message);
        }

        this.removePlugin(pluginName);
        Logger.success(`Disabled plugin: ${pluginName}`);
    }

    async enableInGuild(pluginName, guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) throw new Error(`Guild ${guildId} not found`);

        // Update slash commands for this guild
        await this.client.commandManager.updatePluginStatus(pluginName, true, guildId);

        const plugin = this.getPlugin(pluginName);
        if (plugin.onGuildEnable) {
            await plugin.onGuildEnable(guild);
        }
    }

    async disableInGuild(pluginName, guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) throw new Error(`Guild ${guildId} not found`);

        // Update slash commands for this guild
        await this.client.commandManager.updatePluginStatus(pluginName, false, guildId);

        const plugin = this.getPlugin(pluginName);
        if (plugin.onGuildDisable) {
            await plugin.onGuildDisable(guild);
        }
    }

    /**
     * Calls the event handlers of all plugins.
     * @param {string} eventName
     * @param  {...any} args
     */
    async emit(eventName, ...args) {
        // Get disabled plugins from guild settings if available.
        // Default: all plugins enabled
        let enabled_plugins = this.plugins.map((p) => p.name);
        try {
            const guild = args.find((arg) => arg && arg.guild)?.guild;
            if (guild) {
                const coreSettings = await this.getPlugin("core").dbService.getSettings(guild);
                if (coreSettings && Array.isArray(coreSettings.enabled_plugins)) {
                    enabled_plugins = coreSettings.enabled_plugins;
                }
            }
        } catch (error) {
            Logger.debug("Error getting core settings for event", error);
        }

        // First, handle plugins with no dependencies
        const results = await Promise.all(
            this.plugins
                .filter(
                    (plugin) =>
                        enabled_plugins.includes(plugin.name) &&
                        plugin.eventHandlers.has(eventName) &&
                        plugin.dependencies.length === 0,
                )
                .map(async (plugin) => {
                    try {
                        const data = await plugin.eventHandlers.get(eventName)(...args, plugin);
                        return { name: plugin.name, success: true, data };
                    } catch (error) {
                        Logger.error(`Error in plugin ${plugin.name}:`, error);
                        return { name: plugin.name, success: false, data: null };
                    }
                }),
        );

        // Build response map
        const responseMap = Object.fromEntries(
            results.map((result) => [result.name, { success: result.success, data: result.data }]),
        );

        // Handle plugins with dependencies in order
        for (const plugin of this.plugins.filter(
            (p) =>
                enabled_plugins.includes(p.name) &&
                p.eventHandlers.has(eventName) &&
                p.dependencies.length > 0,
        )) {
            const depArgs = Object.fromEntries(
                plugin.dependencies.map((dep) => [dep, responseMap[dep]]),
            );

            try {
                const data = await plugin.eventHandlers.get(eventName)(...args, depArgs);
                responseMap[plugin.name] = { success: true, data };
            } catch (error) {
                Logger.error(`Error in plugin ${plugin.name}:`, error);
                responseMap[plugin.name] = { success: false, data: null };
            }
        }

        return responseMap;
    }
}

module.exports = PluginManager;
