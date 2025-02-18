const { existsSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const { DBClient } = require("strange-db-client");
const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

class PluginManager {
    /**
     * @type {BotPlugin[]}
     */
    #plugins = [];

    /**
     * @type {Map<string, BotPlugin>}
     */
    #pluginMap = new Map();

    /**
     * @type {string[]}
     */
    #cycleErrors = [];

    /**
     * @type {Set<string>}
     */
    #listeningEvents = new Set();

    get plugins() {
        return this.#plugins;
    }

    get listeningEvents() {
        return this.#listeningEvents;
    }

    constructor(client) {
        this.client = client;
    }

    /**
     * @param {string} pluginName The name of the plugin.
     * @returns {BotPlugin} The plugin object for the given plugin.
     */
    getPlugin(pluginName) {
        return this.#pluginMap.get(pluginName);
    }

    /**
     * Loads all plugins in the given directory.
     * @param {string} directory The directory to load plugins from.
     */
    async loadPlugins(directory) {
        if (!existsSync(directory)) {
            Logger.warn(`Plugins directory ${directory} does not exist. Skipping plugin loading.`);
            return;
        }

        const plugins = readdirSync(directory);
        if (plugins.length === 0) {
            Logger.warn(`Plugins directory ${directory} is empty. Skipping plugin loading.`);
            return;
        }

        // Load core plugin first
        const corePluginPath = join(directory, "core");
        try {
            await this.#loadPlugin(corePluginPath);
        } catch (error) {
            Logger.error(`Error loading plugin ${corePluginPath}:`, error);
            process.exit(1);
        }

        const remPlugins = plugins.filter(
            (f) => statSync(join(directory, f)).isDirectory() && f !== "core" && !f.startsWith("."),
        );

        // Load all plugins
        for (const plugin of remPlugins) {
            const pluginPath = join(directory, plugin);
            try {
                await this.#loadPlugin(pluginPath);
            } catch (error) {
                Logger.error(`Error loading plugin ${pluginPath}:`, error);
            }
        }

        // Detect cycles in the dependency graph
        for (const plugin of this.#pluginMap.values()) {
            if (this.#detectCycles(plugin, new Map(), [])) {
                this.#cycleErrors.push(plugin.name);
                Logger.error(`Cyclic dependency detected in plugin ${plugin.name}`);
            }
        }

        this.#loadPluginsInTopologicalOrder();
        Logger.success(`Loaded ${this.#plugins.length} plugins`);
    }

    /**
     * Loads a plugin from the given path.
     * @param {string} pluginDir
     */
    async #loadPlugin(pluginDir) {
        // Load the bot plugin
        const botEntry = join(pluginDir, "bot");
        if (!existsSync(botEntry)) {
            Logger.debug(`Plugin ${pluginName} does not have a dashboard entry point. Skipping.`);
            return;
        }
        const plugin = require(botEntry);

        if (!(plugin instanceof BotPlugin)) {
            throw new Error("Not a valid plugin (Does it export an instance of the Plugin class?)");
        }

        if (this.#pluginMap.has(plugin.name)) {
            throw new Error(`Plugin name already exists`);
        }

        if (!this.#pluginMap.has(plugin.name)) {
            this.#pluginMap.set(plugin.name, plugin);

            await plugin.load(DBClient.getInstance());

            if (plugin.eventHandlers.size > 0) {
                plugin.eventHandlers.forEach((_, key) => {
                    if (!this.#listeningEvents.has(key)) {
                        this.#listeningEvents.add(key);
                    }
                });
            }

            if (plugin.init) {
                plugin.init(this.client);
            }
            if (plugin.name !== "core" && !plugin.dependencies.includes("core")) {
                plugin.dependencies.push("core");
            }
        }
    }

    #detectCycles(plugin, visited, stack) {
        visited.set(plugin.name, true);
        stack.push(plugin.name);

        for (const dependencyName of plugin.dependencies) {
            if (!visited.has(dependencyName)) {
                const dependencyPlugin = this.#pluginMap.get(dependencyName);
                if (dependencyPlugin) {
                    if (this.#detectCycles(dependencyPlugin, visited, stack)) {
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

    #loadPluginsInTopologicalOrder() {
        const visited = new Map();
        const stack = [];

        // Perform DFS to build the topological order
        for (const plugin of this.#pluginMap.values()) {
            if (this.#cycleErrors.includes(plugin.name)) {
                continue;
            }

            if (!visited.has(plugin.name)) {
                this.#dfs(plugin, visited, stack);
            }
        }

        // Load plugins in the topological order into the `plugins` array
        this.#plugins = stack;
    }

    #dfs(plugin, visited, stack) {
        visited.set(plugin.name, true);

        for (const dependencyName of plugin.dependencies) {
            if (!visited.has(dependencyName)) {
                const dependencyPlugin = this.#pluginMap.get(dependencyName);
                if (dependencyPlugin) {
                    this.#dfs(dependencyPlugin, visited, stack);
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
    async emit(eventName, ...args) {
        const results = await Promise.all(
            this.#plugins
                .filter(
                    (plugin) =>
                        plugin.eventHandlers.has(eventName) && plugin.dependencies.length === 0,
                )
                .map(async (plugin) => {
                    try {
                        const data = await plugin.eventHandlers.get(eventName)(...args, plugin);

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
        for (const plugin of this.#plugins.filter(
            (plugin) => plugin.eventHandlers.has(eventName) && plugin.dependencies.length > 0,
        )) {
            const depArgs = {};
            for (const dependency of plugin.dependencies) {
                depArgs[dependency] = responseMap[dependency];
            }

            try {
                // TODO: append depArgs to args
                const data = await plugin.eventHandlers.get(eventName)(...args, plugin);
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
