const fs = require("node:fs").promises;
const path = require("node:path");
const simpleGit = require("simple-git");
const os = require("node:os");
const crypto = require("crypto");
const lockfile = require("proper-lockfile");
const { Logger } = require("strange-sdk/utils");

class BasePluginManager {
    /**
     * @type {Map<string, import('strange-sdk').BotPlugin|import('strange-sdk').DashboardPlugin>}
     * @protected
     */
    _pluginMap = new Map();
    #repoCache = new Map();

    constructor(registryPath) {
        this.registryPath = registryPath;
        this.pluginsDir = path.dirname(registryPath);
        this.pluginsLockDir = path.join(this.pluginsDir, ".locks");
    }

    // ==============================
    // Public Plugin State Management
    // ==============================

    get plugins() {
        return Array.from(this._pluginMap.values());
    }

    isPluginEnabled(pluginName) {
        return this._pluginMap.has(pluginName);
    }

    getPlugin(pluginName) {
        return this._pluginMap.get(pluginName);
    }

    // ==============================
    // Plugin Lifecycle Management
    // ==============================

    async init() {
        const plugins = await this.getPluginsMeta();
        const corePlugin = plugins.find((p) => p.name === "core");
        if (!corePlugin) {
            throw new Error("Core plugin not found in registry.");
        }

        // Initialize core plugin first
        if (!corePlugin.installed) {
            await this.installPlugin("core");
        }
        await this.enablePlugin("core");

        // Get enabled plugins from core config
        const corePluginInstance = this.getPlugin("core");
        const config = await corePluginInstance.getConfig();
        const enabled_plugins = config.ENABLED_PLUGINS || [];

        // Initialize other plugins in dependency order
        const pluginsToEnable = plugins.filter(
            (p) => enabled_plugins.includes(p.name) && p.name !== "core",
        );

        const loadOrder = this.#getTopologicalOrder(pluginsToEnable);

        for (const pluginName of loadOrder) {
            const meta = plugins.find((p) => p.name === pluginName);
            if (!meta.installed) {
                await this.installPlugin(pluginName);
            }
            await this.enablePlugin(pluginName);
        }

        Logger.success(`Loaded ${this.plugins.length} plugins.`);
    }

    // Abstract methods to be implemented by derived classes
    async enablePlugin(pluginName) {
        throw new Error("Not implemented");
    }

    async disablePlugin(pluginName) {
        throw new Error("Not implemented");
    }

    // ==============================
    // Plugin Installation Management
    // ==============================

    async getPluginsMeta() {
        try {
            const data = await fs.readFile(this.registryPath, "utf8");
            const registry = JSON.parse(data);
            const installedPlugins = await fs.readdir(this.pluginsDir).catch(() => []);

            return registry.map((plugin) => ({
                ...plugin,
                installed: installedPlugins.includes(plugin.name),
                enabled: this.isPluginEnabled(plugin.name),
            }));
        } catch (error) {
            Logger.error("Failed to get plugins:", error);
            throw error;
        }
    }

    async installPlugin(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
        // Create an empty file for locking if it doesn't exist
        await fs.writeFile(pluginDir + ".lock", "", { flag: "a" });

        let release;
        try {
            release = await lockfile.lock(pluginDir + ".lock", {
                retries: {
                    retries: 60,
                    factor: 1,
                    minTimeout: 1000,
                    maxTimeout: 5000,
                },
            });

            if (await fs.access(pluginDir).catch(() => false)) {
                throw new Error("Plugin is already installed.");
            }

            const data = await fs.readFile(this.registryPath, "utf8");
            const meta = JSON.parse(data).find((p) => p.name === pluginName);
            if (!meta) {
                throw new Error("Plugin not found in registry.");
            }

            // Check dependencies
            const missingDeps = [];
            for (const dep of meta.dependencies || []) {
                if (!this._pluginMap.has(dep)) {
                    missingDeps.push(dep);
                }
            }

            if (missingDeps.length > 0) {
                throw new Error(
                    `Missing dependencies for ${pluginName}: ${missingDeps.join(", ")}. Please install them first.`,
                );
            }

            // Clone and copy plugin files
            const repoDir = await this.#cloneOrUpdateRepo(meta.repository);
            const sourcePath = meta.repositoryPath
                ? path.join(repoDir, meta.repositoryPath)
                : repoDir;
            const targetPath = path.join(this.pluginsDir, meta.name);

            await fs.rm(targetPath, { recursive: true, force: true }).catch(() => {});
            await fs.cp(sourcePath, targetPath, { recursive: true });
        } finally {
            if (release) await release();
        }
    }

    async uninstallPlugin(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
        // Create an empty file for locking if it doesn't exist
        await fs.writeFile(pluginDir + ".lock", "", { flag: "a" });

        let release;
        try {
            release = await lockfile.lock(pluginDir + ".lock", {
                retries: {
                    retries: 60,
                    factor: 1,
                    minTimeout: 1000,
                    maxTimeout: 5000,
                },
            });

            if (this._pluginMap.has(pluginName)) {
                throw new Error("Plugin is enabled. Disable it first.");
            }
            await fs.rm(pluginDir, { recursive: true, force: true });
            await fs.unlink(pluginDir + ".lock").catch(() => {});
        } finally {
            if (release) await release();
        }
    }

    // ==============================
    // Private Utility Methods
    // ==============================

    #findCycle(plugins) {
        const visited = new Set();
        const stack = new Set();
        const graph = new Map();

        // Build adjacency list
        plugins.forEach((plugin) => {
            graph.set(plugin.name, (plugin.dependencies || []).slice());
        });

        const cycle = [];

        const dfs = (node) => {
            visited.add(node);
            stack.add(node);

            for (const neighbor of graph.get(node) || []) {
                if (!visited.has(neighbor)) {
                    const foundCycle = dfs(neighbor);
                    if (foundCycle) {
                        cycle.unshift(node);
                        return true;
                    }
                } else if (stack.has(neighbor)) {
                    cycle.push(neighbor);
                    cycle.unshift(node);
                    return true;
                }
            }

            stack.delete(node);
            return false;
        };

        for (const plugin of plugins) {
            if (!visited.has(plugin.name) && dfs(plugin.name)) {
                // Trim the cycle to start from the first repeated element
                const startIndex = cycle.indexOf(cycle[cycle.length - 1]);
                return cycle.slice(startIndex);
            }
        }

        return null;
    }

    #getTopologicalOrder(plugins) {
        // Create adjacency list and in-degree count
        const graph = new Map();
        const inDegree = new Map();

        plugins.forEach((plugin) => {
            graph.set(plugin.name, []);
            inDegree.set(plugin.name, 0);
        });

        // Build the graph
        plugins.forEach((plugin) => {
            (plugin.dependencies || []).forEach((dep) => {
                graph.get(dep).push(plugin.name);
                inDegree.set(plugin.name, inDegree.get(plugin.name) + 1);
            });
        });

        // Find all sources (nodes with in-degree 0)
        const queue = plugins
            .filter((plugin) => inDegree.get(plugin.name) === 0)
            .map((plugin) => plugin.name);

        const result = [];

        while (queue.length) {
            const pluginName = queue.shift();
            result.push(pluginName);

            for (const neighbor of graph.get(pluginName)) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        if (result.length !== plugins.length) {
            const cycle = this.#findCycle(plugins);
            throw new Error(
                `Circular dependency detected in plugins: ${cycle.join(" -> ")} -> ${cycle[0]}`,
            );
        }

        return result;
    }

    async #cloneOrUpdateRepo(repository, branch = "main") {
        const repoHash = this.#createRepoHash(repository);
        const repoDir = path.join(os.tmpdir(), "strange-plugins", repoHash);
        const lockPath = repoDir + ".lock";

        // Create an empty file for locking if it doesn't exist
        await fs.mkdir(path.dirname(repoDir), { recursive: true });
        await fs.writeFile(lockPath, "", { flag: "a" });

        let release;
        try {
            release = await lockfile.lock(lockPath, {
                retries: {
                    retries: 60,
                    factor: 1,
                    minTimeout: 1000,
                    maxTimeout: 5000,
                },
            });

            const git = simpleGit();

            if (this.#repoCache.has(repository)) {
                try {
                    await git.cwd(repoDir).pull("origin", branch);
                    return repoDir;
                } catch (error) {
                    Logger.error(`Failed to update repo ${repository}:`, error);
                    this.#repoCache.delete(repository);
                }
            }

            await fs.rm(repoDir, { recursive: true, force: true }).catch(() => {});
            await git.clone(repository, repoDir, ["--depth", "1", "--branch", branch]);
            this.#repoCache.set(repository, repoDir);
            return repoDir;
        } finally {
            if (release) await release();
        }
    }

    #createRepoHash(repository) {
        return crypto.createHash("md5").update(repository).digest("hex");
    }
}

module.exports = BasePluginManager;
