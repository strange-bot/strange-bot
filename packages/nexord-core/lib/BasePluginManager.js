const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const simpleGit = require("simple-git");
const crypto = require("crypto");
const lockfile = require("proper-lockfile");
const { Logger } = require("nexord-sdk/utils");
const execa = require("execa");
const fetch = require("node-fetch");
const semver = require("semver");

class BasePluginManager {
    constructor(registryPath, pluginsDir, options = {}) {
        this.registryPath = this._isUrl(registryPath) ? registryPath : path.resolve(registryPath);
        this.pluginsDir = path.resolve(pluginsDir);
        this.pluginsLockDir = path.join(this.pluginsDir, ".locks");
        this.repoCacheDir = options.repoCacheDir
            ? path.resolve(options.repoCacheDir)
            : path.join(this.pluginsDir, ".repo_cache");

        this._pluginMap = new Map();
    }

    // ==============================
    // Public Plugin State Management
    // ==============================

    get plugins() {
        return Array.from(this._pluginMap.values()).filter((p) => p !== undefined && p !== null);
    }

    get availablePlugins() {
        return Array.from(this._pluginMap.keys());
    }

    isPluginEnabled(pluginName) {
        return this._pluginMap.has(pluginName);
    }

    getPlugin(pluginName) {
        return this._pluginMap.get(pluginName);
    }

    setPlugin(pluginName, pluginInstance) {
        this._pluginMap.set(pluginName, pluginInstance);
    }

    removePlugin(pluginName) {
        this._pluginMap.delete(pluginName);
    }

    // ==============================
    // Plugin Lifecycle Management
    // ==============================

    async _registerCorePackages() {
        const sdkPath = path.resolve(__dirname, '../../nexord-sdk');
        const corePath = path.resolve(__dirname, '..');
        
        try {
            Logger.info("Registering core packages with yarn...");
            
            await execa("yarn", ["link"], {
                cwd: sdkPath,
                stdio: "pipe",
            });
            Logger.debug("Registered nexord-sdk");
            
            await execa("yarn", ["link"], {
                cwd: corePath,
                stdio: "pipe",
            });
            Logger.debug("Registered nexord-core");
        } catch (err) {
            Logger.warn("Failed to register core packages:", err.message);
            // Don't throw - this might fail if packages are already registered
        }
    }

    async init() {
        // Register core packages before installing plugins
        await this._registerCorePackages();
        
        // Clean up old repository caches to prevent unbounded growth
        await this.cleanRepoCache(10);
        
        const plugins = await this.getPluginsMeta();
        const corePlugin = plugins.find((p) => p.name === "core");
        if (!corePlugin) {
            throw new Error("Core plugin not found in registry.");
        }

        if (!corePlugin.installed) {
            try {
                await this.installPlugin("core", true);
            } catch (err) {
                Logger.error("Failed to install core plugin. Aborting initialization.", err);
                process.exit(1);
            }
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

        const loadOrder = this._getTopologicalOrder(pluginsToEnable);
        for (const pluginName of loadOrder) {
            const meta = pluginsToEnable.find((p) => p.name === pluginName);
            if (!meta.installed) {
                try {
                    await this.installPlugin(pluginName, true);
                } catch (err) {
                    Logger.error(`Failed to install plugin ${pluginName}. Skipping.`, err);
                    continue;
                }
            }

            try {
                await this.enablePlugin(pluginName);
            } catch (err) {
                Logger.error(`Failed to enable plugin ${pluginName}. Skipping.`, err);
            }
        }

        Logger.success(`Loaded ${this.availablePlugins.length} plugins.`);
    }

    // ==============================
    // Abstract methods to be implemented by derived classes
    // ==============================

    async postInstall(pluginName, targetPath, meta) {
        // no-op in base
    }

    async preUninstall(pluginName) {
        // no-op in base
    }

    async enablePlugin(pluginName) {
        throw new Error("Not implemented");
    }

    async disablePlugin(pluginName) {
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
            if (this._isUrl(this.registryPath)) {
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
                data = await fsp.readFile(this.registryPath, "utf8");
            }

            const registry = JSON.parse(data);
            const localMeta = await this._localPluginMeta();

            const pluginsMeta = await Promise.all(
                registry.map(async (plugin) => {
                    const installedVersion = localMeta[plugin.name]
                        ? localMeta[plugin.name].installedVersion
                        : null;

                    return {
                        ...plugin,
                        enabled: this.isPluginEnabled(plugin.name),
                        installed: installedVersion !== null,
                        currentVersion: installedVersion,
                        hasUpdate:
                            !!installedVersion && semver.lt(installedVersion, plugin.version),
                    };
                }),
            );
            return pluginsMeta;
        } catch (error) {
            Logger.error("Failed to get plugins:", error);
            throw error;
        }
    }

    async installPlugin(pluginName, _skipVerify = false) {
        const targetPath = path.join(this.pluginsDir, pluginName);
        const lockPath = targetPath + ".lock";

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

            // Fetch metadata AFTER acquiring the lock
            const pluginsMeta = await this.getPluginsMeta();
            const meta = pluginsMeta.find((p) => p.name === pluginName);

            if (!_skipVerify) {
                if (!meta) {
                    throw new Error("Plugin not found in registry.");
                }

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
            }

            if (!meta.installed) {
                await fsp.mkdir(path.dirname(lockPath), { recursive: true });
                await fsp.rm(targetPath, { recursive: true, force: true }).catch(() => {});
                const repoDir = await this._syncRepo(meta.repository);
                const sourcePath = meta.repositoryPath
                    ? path.join(repoDir, meta.repositoryPath)
                    : repoDir;
                await fsp.cp(sourcePath, targetPath, { recursive: true });

                try {
                    // TODO: Temporary: link nexord-sdk and nexord-core for local dev
                    await execa("yarn", ["link", "nexord-sdk"], {
                        cwd: targetPath,
                        stdio: "pipe",
                        env: { ...process.env },
                    });
                    await execa("yarn", ["link", "nexord-core"], {
                        cwd: targetPath,
                        stdio: "pipe",
                        env: { ...process.env },
                    });
                    await execa("yarn", ["install", "--production"], {
                        cwd: targetPath,
                        stdio: "pipe",
                        env: { ...process.env },
                    });
                } catch (error) {
                    Logger.error(`Failed to install dependencies for ${pluginName}:`, error);
                    await fsp.rm(targetPath, { recursive: true, force: true }).catch(() => {});
                    throw error;
                }
            } else {
                Logger.warn(`Plugin ${pluginName} is already installed. Skipping installation.`);
            }

            // run post-install tasks (dashboard builds, etc.)
            try {
                await this.postInstall(pluginName, targetPath, meta);
            } catch (err) {
                Logger.error(`postInstall hook failed for ${pluginName}:`, err);
                await fsp.rm(targetPath, { recursive: true, force: true }).catch(() => {});
                throw err;
            }
        } finally {
            if (release) await release();
        }

        Logger.success(`Installed plugin: ${pluginName}`);
    }

    async uninstallPlugin(pluginName) {
        if (this.isPluginEnabled(pluginName)) {
            throw new Error(
                `Cannot uninstall enabled plugin ${pluginName}. Please disable it first.`,
            );
        }

        await this.preUninstall(pluginName);

        const pluginDir = path.join(this.pluginsDir, pluginName);
        const lockPath = pluginDir + ".lock";

        // Create an empty file for locking if it doesn't exist
        await fsp.writeFile(lockPath, "", { flag: "a" }).catch(() => {});

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

            // Remove plugin directory
            await fsp.rm(pluginDir, { recursive: true, force: true }).catch(() => {});
        } finally {
            if (release) {
                try {
                    await release();
                } catch (error) {
                    Logger.debug(`Failed to release lock for ${pluginName}:`, error.message);
                }
            }

            // Clean up lock file after release
            try {
                await fsp.unlink(lockPath);
            } catch (error) {
                // Ignore if file doesn't exist
                if (error.code !== "ENOENT") {
                    Logger.debug(`Failed to remove lock file for ${pluginName}:`, error.message);
                }
            }
        }

        Logger.success(`Uninstalled plugin: ${pluginName}`);
    }

    // ==============================
    // Private Utility Methods
    // ==============================

    _findCycle(plugins) {
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

    _getTopologicalOrder(plugins) {
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
            const cycle = this._findCycle(plugins);
            throw new Error(
                `Circular dependency detected in plugins: ${cycle.join(" -> ")} -> ${cycle[0]}`,
            );
        }

        return result;
    }

    async _syncRepo(repository) {
        const repoHash = this._createRepoHash(repository);
        const repoDir = path.join(this.repoCacheDir, repoHash);
        const lockPath = repoDir + ".lock";

        // Create an empty file for locking if it doesn't exist
        await fsp.mkdir(path.dirname(repoDir), { recursive: true });
        await fsp.writeFile(lockPath, "", { flag: "a" });

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
            if (fs.existsSync(repoDir)) {
                await git.cwd(repoDir).pull("origin", "main");
                // Update access time for cache LRU management
                await fsp.utimes(repoDir, Date.now() / 1000, Date.now() / 1000).catch(() => {});
            } else {
                await git.clone(repository, repoDir, ["--depth", "1", "--branch", "main"]);
            }

            return repoDir;
        } finally {
            if (release) await release();
        }
    }

    _createRepoHash(repository) {
        return crypto.createHash("md5").update(repository).digest("hex");
    }

    /**
     * Clean old repository caches, keeping only the most recent ones.
     * Implements LRU (Least Recently Used) eviction strategy.
     * @param {number} maxRepos - Maximum number of repositories to keep (default: 10)
     */
    async cleanRepoCache(maxRepos = 10) {
        try {
            if (!fs.existsSync(this.repoCacheDir)) {
                return;
            }

            const entries = await fsp.readdir(this.repoCacheDir, { withFileTypes: true });
            const repoDirs = entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => ({
                    name: entry.name,
                    path: path.join(this.repoCacheDir, entry.name),
                }));

            if (repoDirs.length <= maxRepos) {
                return;
            }

            // Get access time for each repo
            const reposWithTime = await Promise.all(
                repoDirs.map(async (repo) => {
                    try {
                        const stats = await fsp.stat(repo.path);
                        return {
                            ...repo,
                            atime: stats.atimeMs,
                        };
                    } catch (error) {
                        Logger.warn(`Failed to stat repo ${repo.name}:`, error);
                        return { ...repo, atime: 0 };
                    }
                }),
            );

            // Sort by access time (ascending) - oldest first
            reposWithTime.sort((a, b) => a.atime - b.atime);

            // Remove oldest repos until we're at maxRepos
            const toRemove = reposWithTime.slice(0, reposWithTime.length - maxRepos);
            for (const repo of toRemove) {
                try {
                    await fsp.rm(repo.path, { recursive: true, force: true });
                    // Also try to remove associated lock file
                    await fsp.unlink(repo.path + ".lock").catch(() => {});
                    Logger.debug(`Cleaned up old repository cache: ${repo.name}`);
                } catch (error) {
                    Logger.warn(`Failed to clean repo cache ${repo.name}:`, error);
                }
            }

            Logger.info(`Repository cache cleanup: removed ${toRemove.length} old repos`);
        } catch (error) {
            Logger.warn("Repository cache cleanup failed:", error);
        }
    }

    _isUrl(str) {
        try {
            const url = new URL(str);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }

    async _localPluginMeta() {
        const entries = await fsp.readdir(this.pluginsDir, { withFileTypes: true });
        const installedPlugins = entries
            .filter((entry) => entry.isDirectory())
            .filter((entry) => {
                const yarnLockPath = path.join(this.pluginsDir, entry.name, "yarn.lock");
                return fs.existsSync(yarnLockPath);
            })
            .map((entry) => entry.name);

        const pluginMeta = {};
        for (const pluginName of installedPlugins) {
            let installedVersion = null;
            try {
                const packageJsonPath = path.join(this.pluginsDir, pluginName, "package.json");
                const packageData = await fsp.readFile(packageJsonPath, "utf8");
                const packageJson = JSON.parse(packageData);
                installedVersion = packageJson.version || null;
            } catch (error) {
                Logger.warn(`Failed to read version for plugin ${pluginName}:`, error);
            }

            pluginMeta[pluginName] = {
                installed: true,
                installedVersion,
            };
        }

        return pluginMeta;
    }
}

module.exports = BasePluginManager;
