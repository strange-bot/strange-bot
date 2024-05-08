const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const { Plugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager {
    /**
     * @type {Object.<string, Object>}
     */
    static #settingsRegistry = {};

    /**
     * @type {import('./Plugin')[]}
     */
    static #plugins = [];

    /**
     * @type {Map<string, import('./Plugin')>}
     */
    static #pluginMap = new Map();

    /**
     * @type {string[]}
     */
    static #cycleErrors = [];

    /**
     * @type {Set<string>}
     */
    static #listeningEvents = new Set();

    static get allSettings() {
        return { ...PluginManager.#settingsRegistry };
    }

    static get plugins() {
        return PluginManager.#plugins;
    }

    static get listeningEvents() {
        return PluginManager.#listeningEvents;
    }

    /**
     * Loads all plugins in the given directory.
     * @param {import('discord.js').Client} client
     * @param {string} directory The directory to load plugins from.
     * @param {string[]} activePlugins The list of plugins to load.
     */
    static loadPlugins(client, directory, activePlugins) {
        if (!activePlugins.includes("core")) {
            activePlugins.push("core");
        }

        const plugins = readdirSync(directory).filter(
            (f) => statSync(join(directory, f)).isDirectory() && activePlugins.includes(f),
        );

        // Load all plugins
        for (const plugin of plugins) {
            const pluginPath = join(directory, plugin);
            try {
                PluginManager.#loadPlugin(client, pluginPath);
            } catch (error) {
                Logger.error(`Error loading plugin ${pluginPath}:`, error);
            }
        }

        // Detect cycles in the dependency graph
        for (const plugin of PluginManager.#pluginMap.values()) {
            if (PluginManager.#detectCycles(plugin, new Map(), [])) {
                PluginManager.#cycleErrors.push(plugin.name);
                Logger.error(`Cyclic dependency detected in plugin ${plugin.name}`);
            }
        }

        PluginManager.#loadPluginsInTopologicalOrder();
        Logger.success(`Loaded ${PluginManager.#plugins.length} plugins`);
    }

    /**
     * Loads a plugin from the given path.
     * @param {import('discord.js').Client} client
     * @param {string} pluginDir
     */
    static #loadPlugin(client, pluginDir) {
        const plugin = require(pluginDir);

        if (!(plugin instanceof Plugin)) {
            throw new Error("Not a valid plugin (Does it export an instance of the Plugin class?)");
        }

        if (PluginManager.#pluginMap.has(plugin.name)) {
            throw new Error(`Plugin name already exists`);
        }

        if (!PluginManager.#pluginMap.has(plugin.name)) {
            PluginManager.#pluginMap.set(plugin.name, plugin);
            if (plugin.settings) {
                PluginManager.#settingsRegistry[plugin.name] = plugin.settings;
            }
            if (plugin.eventHandlers.size > 0) {
                plugin.eventHandlers.forEach((_, key) => {
                    if (!PluginManager.#listeningEvents.has(key)) {
                        PluginManager.#listeningEvents.add(key);
                    }
                });
            }
            if (plugin.init) {
                plugin.init(client);
            }
            if (plugin.name !== "core" && !plugin.dependencies.includes("core")) {
                plugin.dependencies.push("core");
            }
        }
    }

    static #detectCycles(plugin, visited, stack) {
        visited.set(plugin.name, true);
        stack.push(plugin.name);

        for (const dependencyName of plugin.dependencies) {
            if (!visited.has(dependencyName)) {
                const dependencyPlugin = PluginManager.#pluginMap.get(dependencyName);
                if (dependencyPlugin) {
                    if (PluginManager.#detectCycles(dependencyPlugin, visited, stack)) {
                        return true;
                    }
                }
            } else if (stack.includes(dependencyName)) {
                return true;
            }
        }

        stack.pop();
        return false;
    }

    static #loadPluginsInTopologicalOrder() {
        const visited = new Map();
        const stack = [];

        // Perform DFS to build the topological order
        for (const plugin of PluginManager.#pluginMap.values()) {
            if (PluginManager.#cycleErrors.includes(plugin.name)) {
                continue;
            }

            if (!visited.has(plugin.name)) {
                PluginManager.#dfs(plugin, visited, stack);
            }
        }

        // Load plugins in the topological order into the `plugins` array
        PluginManager.#plugins = stack;
    }

    static #dfs(plugin, visited, stack) {
        visited.set(plugin.name, true);

        for (const dependencyName of plugin.dependencies) {
            if (!visited.has(dependencyName)) {
                const dependencyPlugin = PluginManager.#pluginMap.get(dependencyName);
                if (dependencyPlugin) {
                    PluginManager.#dfs(dependencyPlugin, visited, stack);
                }
            }
        }

        stack.push(plugin);
    }

    /**
     * Calls the event handlers of all plugins.
     * @param {string} eventName
     * @param  {...any} args
     */
    static async emit(eventName, ...args) {
        const results = await Promise.all(
            PluginManager.#plugins
                .filter(
                    (plugin) =>
                        plugin.eventHandlers.has(eventName) && plugin.dependencies.length === 0,
                )
                .map(async (plugin) => {
                    try {
                        const data = await plugin.eventHandlers.get(eventName)(...args);

                        return {
                            name: plugin.name,
                            success: true,
                            data: data,
                        };
                    } catch (error) {
                        Logger.error(`Error in plugin ${plugin.name}: ${error.message}`, error);
                        return {
                            name: plugin.name,
                            success: false,
                            data: null, // You can include additional error details if needed
                        };
                    }
                }),
        );

        // Save the results in a map
        const responseMap = results.reduce((map, result) => {
            map[result.name] = {
                success: result.success,
                data: result.data,
            };
            return map;
        }, {});

        // Call the plugins with dependencies in topological order
        for (const plugin of PluginManager.#plugins.filter(
            (plugin) => plugin.eventHandlers.has(eventName) && plugin.dependencies.length > 0,
        )) {
            const depArgs = {};
            for (const dependency of plugin.dependencies) {
                depArgs[dependency] = responseMap[dependency];
            }

            try {
                // TODO: append depArgs to args
                const data = await plugin.eventHandlers.get(eventName)(...args);
                responseMap[plugin.name] = {
                    success: true,
                    data: data,
                };
            } catch (error) {
                Logger.error(`Error in plugin ${plugin.name}: ${error.message}`, error);
                responseMap[plugin.name] = {
                    success: false,
                    data: null, // You can include additional error details if needed
                };
            }
        }
    }
}

module.exports = PluginManager;
