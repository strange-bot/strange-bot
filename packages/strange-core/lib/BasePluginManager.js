const fs = require("node:fs").promises;
const path = require("node:path");
const simpleGit = require("simple-git");
const os = require("node:os");
const crypto = require("crypto");
const lockfile = require("proper-lockfile");
const { Logger } = require("strange-sdk/utils");
const execa = require("execa");
const fetch = require("node-fetch");
const semver = require("semver");

class BasePluginManager {
    #pluginMap = new Map();
    #repoCache = new Map();

    constructor(registryPath, pluginsDir) {
        this.registryPath = this.#isUrl(registryPath) ? registryPath : path.resolve(registryPath);
        this.pluginsDir = path.resolve(pluginsDir);
        this.pluginsLockDir = path.join(this.pluginsDir, ".locks");
    }

    // ==============================
    // Public Plugin State Management
    // ==============================

    get plugins() {
        return Array.from(this.#pluginMap.values()).filter((p) => p !== undefined && p !== null);
    }

    get availablePlugins() {
        return Array.from(this.#pluginMap.keys());
    }

    isPluginEnabled(pluginName) {
        return this.#pluginMap.has(pluginName);
    }

    getPlugin(pluginName) {
        return this.#pluginMap.get(pluginName);
    }

    setPlugin(pluginName, plugin) {
        this.#pluginMap.set(pluginName, plugin);
    }

    removePlugin(pluginName) {
        this.#pluginMap.delete(pluginName);
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

        // Get all available plugins from registry except disabled ones
        const enableablePlugins = plugins.filter(
            (p) => p.name !== "core" && enabled_plugins.includes(p.name),
        );

        // Check dependencies and filter out plugins with missing dependencies
        const pluginsToDisable = [];
        const pluginsToSkip = [];

        for (const plugin of enableablePlugins) {
            // Check if all dependencies are available in the registry
            const missingDeps = (plugin.dependencies || []).filter(
                (dep) => !plugins.some((p) => p.name === dep),
            );

            if (missingDeps.length > 0) {
                Logger.warn(
                    `Plugin ${plugin.name} has dependencies that are not in registry: ${missingDeps.join(", ")}. Skipping this plugin.`,
                );
                pluginsToSkip.push(plugin.name);
                continue;
            }

            // Check if all dependencies are in the enabled_plugins list
            const disabledDeps = (plugin.dependencies || []).filter(
                (dep) => dep !== "core" && !enabled_plugins.includes(dep),
            );

            if (disabledDeps.length > 0) {
                Logger.warn(
                    `Plugin ${plugin.name} has dependencies that are not enabled: ${disabledDeps.join(", ")}. Adding to disabled plugins.`,
                );
                pluginsToDisable.push(plugin.name);
            }
        }

        // Update enabled plugins list if needed
        if (pluginsToDisable.length > 0) {
            for (const pluginName of pluginsToDisable) {
                const index = enabled_plugins.indexOf(pluginName);
                if (index !== -1) {
                    enabled_plugins.splice(index, 1);
                }
            }
            config.ENABLED_PLUGINS = enabled_plugins;
            await config.save(config);
            Logger.info(
                `Removed ${pluginsToDisable.length} plugins with disabled dependencies from enabled list.`,
            );
        }

        // Filter plugins to enable (all plugins except core, disabled ones and ones with missing dependencies)
        const pluginsToEnable = plugins.filter(
            (p) =>
                p.name !== "core" &&
                enabled_plugins.includes(p.name) &&
                !pluginsToSkip.includes(p.name),
        );

        const loadOrder = this.#getTopologicalOrder(pluginsToEnable);

        for (const pluginName of loadOrder) {
            const meta = plugins.find((p) => p.name === pluginName);
            if (!meta.installed) {
                await this.installPlugin(pluginName);
            }
            await this.enablePlugin(pluginName);
        }

        Logger.success(`Loaded ${this.availablePlugins.length} plugins.`);
    }

    // ==============================
    // Abstract methods to be implemented by derived classes
    // ==============================

    async enablePlugin(pluginName) {
        throw new Error("Not implemented");
    }

    async disbalePlugin(pluginName) {
        throw new Error("Not implemented");
    }

    async enableInGuild(pluginName, guildId) {
        throw new Error("Not implemented");
    }

    async disableInGuild(pluginName, guildId) {
        throw new Error("Not implemented");
    }

    // ==============================
    // Plugin Installation Management
    // ==============================

    async getPluginsMeta() {
        try {
            let data;
            if (this.#isUrl(this.registryPath)) {
                // Fetch registry data from URL
                const response = await fetch(this.registryPath);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch registry from ${this.registryPath}: ${response.status} ${response.statusText}`,
                    );
                }
                data = await response.text();
            } else {
                // Read registry data from local file
                data = await fs.readFile(this.registryPath, "utf8");
            }

            const registry = JSON.parse(data);
            const installedPlugins = await fs.readdir(this.pluginsDir).catch(() => []);

            const pluginsMeta = await Promise.all(
                registry.map(async (plugin) => {
                    let currentVersion;
                    const isInstalled = installedPlugins.includes(plugin.name);
                    if (isInstalled) {
                        currentVersion = this.#pluginMap.get(plugin.name)?.version;
                        if (!currentVersion) {
                            const packageJsonPath = path.join(
                                this.pluginsDir,
                                plugin.name,
                                "package.json",
                            );
                            const packageJsonData = await fs.readFile(packageJsonPath, "utf8");
                            const packageJson = JSON.parse(packageJsonData);
                            currentVersion = packageJson.version;
                        }
                    } else {
                        currentVersion = plugin.version;
                    }

                    return {
                        ...plugin,
                        installed: installedPlugins.includes(plugin.name),
                        enabled: this.isPluginEnabled(plugin.name),
                        currentVersion,
                        hasUpdate: currentVersion && semver.lt(currentVersion, plugin.version),
                    };
                }),
            );
            return pluginsMeta;
        } catch (error) {
            Logger.error("Failed to get plugins:", error);
            throw error;
        }
    }

    async installPlugin(pluginName) {
        const pluginDir = path.join(this.pluginsDir, pluginName);
        const lockPath = pluginDir + ".lock";

        let release;
        try {
            release = await lockfile.lock(lockPath, {
                retries: {
                    retries: 60,
                    factor: 1,
                    minTimeout: 1000,
                    maxTimeout: 5000,
                },
                realpath: false,
            });

            if (await fs.access(pluginDir).catch(() => false)) {
                throw new Error("Plugin is already installed.");
            }

            const data = await this.getPluginsMeta();
            const meta = data.find((p) => p.name === pluginName);
            if (!meta) {
                throw new Error("Plugin not found in registry.");
            }

            // Check dependencies
            const missingDeps = [];
            for (const dep of meta.dependencies || []) {
                if (!this.#pluginMap.has(dep)) {
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

            // Install npm dependencies
            try {
                await execa(
                    "pnpm",
                    ["install", "--no-frozen-lockfile"], // Removed the --ignore-scripts flag to allow lifecycle scripts to run during dependency installation.
                    {
                        cwd: targetPath,
                        stdio: "pipe",
                        env: {
                            ...process.env,
                            PNPM_WORKSPACE_DIR: path.resolve(__dirname, "../../../..")
                        }
                    },
                );
            } catch (error) {
                Logger.error(`Failed to install dependencies for ${pluginName}:`, error);
                // Cleanup on failed install
                await fs.rm(targetPath, { recursive: true, force: true }).catch(() => {});
                throw error;
            }
        } finally {
            if (release) await release();
        }

        Logger.success(`Installed plugin: ${pluginName}`);
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

            if (this.#pluginMap.has(pluginName)) {
                throw new Error("Plugin is enabled. Disable it first.");
            }
            await fs.rm(pluginDir, { recursive: true, force: true });
            await fs.unlink(pluginDir + ".lock").catch(() => {});
        } finally {
            if (release) await release();
        }

        Logger.success(`Uninstalled plugin: ${pluginName}`);
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

        // Get all plugin names for easy lookup
        const pluginNames = new Set(plugins.map((p) => p.name));

        plugins.forEach((plugin) => {
            graph.set(plugin.name, []);
            inDegree.set(plugin.name, 0);
        });

        // Build the graph
        plugins.forEach((plugin) => {
            (plugin.dependencies || []).forEach((dep) => {
                if (dep === "core") return;
                // Only process dependencies that exist in our plugin list
                if (pluginNames.has(dep)) {
                    graph.get(dep).push(plugin.name);
                    inDegree.set(plugin.name, inDegree.get(plugin.name) + 1);
                }
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

    #isUrl(str) {
        try {
            const url = new URL(str);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }
}

module.exports = BasePluginManager;
