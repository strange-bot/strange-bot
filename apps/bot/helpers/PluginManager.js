const { BasePluginManager } = require("strange-core");
const path = require("node:path");
const { DBClient } = require("strange-db-client");
const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager extends BasePluginManager {
    /**
     * @type {Set<string>}
     */
    #listeningEvents = new Set();

    get listeningEvents() {
        return this.#listeningEvents;
    }

    constructor(client, registryPath) {
        super(registryPath);
        this.client = client;
    }

    async onEnable(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
        const botEntry = path.join(pluginDir, "bot");

        try {
            const plugin = require(botEntry);
            if (!(plugin instanceof BotPlugin)) {
                throw new Error(
                    "Not a valid plugin (Does it export an instance of the BotPlugin class?)",
                );
            }

            await plugin.init(this.client, DBClient.getInstance());

            // Register event handlers
            if (plugin.eventHandlers.size > 0) {
                plugin.eventHandlers.forEach((_, key) => {
                    if (!this.#listeningEvents.has(key)) {
                        this.#listeningEvents.add(key);
                    }
                });
            }

            return plugin;
        } catch (error) {
            if (error.code === "MODULE_NOT_FOUND") {
                Logger.debug(`Plugin ${pluginDir} does not have a bot entry point. Skipping.`);
                return;
            }
            throw error;
        }
    }

    async onDisable(pluginName) {
        const plugin = this.getPlugin(pluginName);

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

        await plugin.destroy?.();
    }

    /**
     * Calls the event handlers of all plugins.
     * @param {string} eventName
     * @param  {...any} args
     */
    async emit(eventName, ...args) {
        // Get disabled plugins from guild settings if available
        let disabled_plugins = [];
        try {
            const guild = args.find((arg) => arg && arg.guild)?.guild;
            if (guild) {
                const coreSettings = await guild.getSettings("core");
                disabled_plugins = coreSettings.disabled_plugins;
            }
        } catch (error) {
            Logger.debug("Error getting core settings for event", error);
        }

        // First, handle plugins with no dependencies
        const results = await Promise.all(
            this.plugins
                .filter(
                    (plugin) =>
                        !disabled_plugins.includes(plugin.name) &&
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
                !disabled_plugins.includes(p.name) &&
                p.eventHandlers.has(eventName) &&
                p.dependencies.length > 0,
        )) {
            const depArgs = Object.fromEntries(
                plugin.dependencies.map((dep) => [dep, responseMap[dep]]),
            );

            try {
                const data = await plugin.eventHandlers.get(eventName)(...args, plugin, depArgs);
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
