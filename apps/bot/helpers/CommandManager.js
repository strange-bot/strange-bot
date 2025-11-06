const { Collection, ApplicationCommandType } = require("discord.js");
const { Logger } = require("strange-sdk/utils");

class CommandManager {
    constructor(client) {
        this.client = client;
        this.prefixCommands = new Collection();
        this.slashCommands = new Collection();
        this.contextMenus = new Collection();
        this.pendingRegistrations = new Map(); // Track pending command registrations
        this.registrationQueue = []; // Queue for guild IDs that need registration
        this.isProcessingQueue = false;
    }

    /**
     * Register commands and contexts from a plugin
     * @param {import("strange-sdk").BotPlugin} plugin - The plugin to register commands from
     */
    registerPlugin(plugin) {
        Logger.debug(`Registering commands from ${plugin.name}...`);

        // Register commands
        for (const cmd of plugin.commands) {
            // Prefix Command
            if (cmd.command?.enabled) {
                if (this.prefixCommands.has(cmd.name)) {
                    throw new Error(`Command ${cmd.name} already registered`);
                }
                this.prefixCommands.set(cmd.name, cmd);
                if (Array.isArray(cmd.command.aliases)) {
                    cmd.command.aliases.forEach((alias) => {
                        if (this.prefixCommands.has(alias))
                            throw new Error(`Alias ${alias} already registered`);
                        this.prefixCommands.set(alias.toLowerCase(), cmd);
                    });
                }
            }

            // Slash Command
            if (cmd.slashCommand?.enabled) {
                if (this.slashCommands.has(cmd.name))
                    throw new Error(`Slash Command ${cmd.name} already registered`);
                this.slashCommands.set(cmd.name, cmd);
            } else {
                Logger.debug(`Skipping slash command ${cmd.name}. Disabled!`);
            }
        }

        // Check max count limit for contexts
        const userContexts = this.contextMenus.filter(
            (ctx) => ctx.type === ApplicationCommandType.User,
        ).size;
        const messageContexts = this.contextMenus.filter(
            (ctx) => ctx.type === ApplicationCommandType.Message,
        ).size;

        if (userContexts + plugin.userContextsCount > 3) {
            throw new Error("A maximum of 3 USER contexts can be enabled");
        }
        if (messageContexts + plugin.messageContextsCount > 3) {
            throw new Error("A maximum of 3 MESSAGE contexts can be enabled");
        }

        // Register contexts
        for (const ctx of plugin.contexts) {
            if (this.contextMenus.has(ctx.name)) {
                throw new Error(`Context ${ctx.name} already registered`);
            }

            this.contextMenus.set(ctx.name, ctx);
        }

        Logger.debug(`Plugin loaded`, {
            name: plugin.name,
            prefixCommands: plugin.prefixCount,
            slashCommands: plugin.slashCount,
            userContexts: plugin.userContextsCount,
            messageContexts: plugin.messageContextsCount,
        });
    }

    /**
     * Unregister commands and contexts from a plugin
     * @param {import("strange-sdk").BotPlugin} plugin - The plugin to unregister commands from
     */
    unregisterPlugin(plugin) {
        // Unregister prefix commands and their aliases
        this.prefixCommands
            .filter((cmd) => cmd.plugin.name === plugin.name)
            .forEach((cmd) => {
                this.prefixCommands.delete(cmd.name);
                cmd.command.aliases?.forEach((alias) => this.prefixCommands.delete(alias));
            });

        // Unregister slash commands
        this.slashCommands
            .filter((cmd) => cmd.plugin.name === plugin.name)
            .forEach((cmd) => {
                this.slashCommands.delete(cmd.name);
            });

        // Unregister context menus
        this.contextMenus
            .filter((ctx) => ctx.plugin.name === plugin.name)
            .forEach((ctx) => {
                this.contextMenus.delete(ctx.name);
            });

        Logger.debug(`Unloaded commands and contexts from ${plugin.name}`);
    }

    /**
     * Find a prefix command by name or alias
     * @param {string} commandName - The command name or alias
     * @returns {import("strange-sdk").CommandType|undefined}
     */
    findPrefixCommand(commandName) {
        return this.prefixCommands.get(commandName.toLowerCase());
    }

    /**
     * Find a slash command by name
     * @param {string} commandName - The command name
     * @returns {import("strange-sdk").CommandType|undefined}
     */
    findSlashCommand(commandName) {
        return this.slashCommands.get(commandName);
    }

    /**
     * Find a context menu by name
     * @param {string} contextName - The context menu name
     * @returns {import("strange-sdk").ContextType|undefined}
     */
    findContextMenu(contextName) {
        return this.contextMenus.get(contextName);
    }

    /**
     * Register slash commands and context menus for a guild
     * @param {string} guildId - The guild ID to register commands in
     * @param {boolean} [force=false] - Whether to force registration regardless of plugin status
     */
    async registerInteractions(guildId, force = false) {
        try {
            // Add to queue and process
            this.#queueGuildRegistration(guildId, force);
            return this.#processRegistrationQueue();
        } catch (error) {
            Logger.error("Failed to register interactions", error);
            throw error;
        }
    }

    /**
     * Queue a guild for command registration
     * @param {string} guildId - The guild ID to register commands for
     * @param {boolean} force - Whether to force registration
     */
    #queueGuildRegistration(guildId, force = false) {
        // Check if this guild is already in the queue
        if (!this.registrationQueue.some((item) => item.guildId === guildId)) {
            this.registrationQueue.push({ guildId, force, timestamp: Date.now() });
            Logger.debug(`Queued command registration for guild ${guildId}`);
        }
    }

    /**
     * Process the registration queue with rate limit awareness
     */
    async #processRegistrationQueue() {
        // If already processing, don't start a new processing cycle
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            // Process queue in chunks to avoid blocking the main thread
            const processChunk = async () => {
                if (this.registrationQueue.length === 0) {
                    this.isProcessingQueue = false;
                    return;
                }

                // Process a small number of items per tick
                const item = this.registrationQueue.shift();
                const { guildId, force } = item;

                // Skip if this guild had a registration in the last 10 seconds
                const lastRegistration = this.pendingRegistrations.get(guildId);
                if (lastRegistration && Date.now() - lastRegistration < 10000 && !force) {
                    Logger.debug(`Skipping registration for guild ${guildId}, too recent`);

                    // Continue with next chunk after a small delay
                    setTimeout(() => processChunk(), 10);
                    return;
                }

                this.pendingRegistrations.set(guildId, Date.now());

                try {
                    await this.#registerGuildCommands(guildId, force);
                } catch (error) {
                    Logger.error(`Failed to register commands for guild ${guildId}:`, error);
                }

                // Continue with next chunk after a delay to respect rate limits
                // Add more delay between operations (250ms) to avoid locking the main thread
                setTimeout(() => processChunk(), 250);
            };

            // Start processing the first chunk
            processChunk();
        } catch (error) {
            Logger.error("Error processing registration queue:", error);
            this.isProcessingQueue = false;

            // Clean up old pending registrations
            this.#cleanupPendingRegistrations();
        }
    }

    /**
     * Clean up old pending registrations
     */
    #cleanupPendingRegistrations() {
        const now = Date.now();
        for (const [guildId, timestamp] of this.pendingRegistrations.entries()) {
            if (now - timestamp > 60000) {
                // 1 minute
                this.pendingRegistrations.delete(guildId);
            }
        }
    }

    /**
     * Register commands for a specific guild based on enabled plugins
     * @param {string} guildId - The guild ID
     * @param {boolean} force - Whether to force registration
     */
    async #registerGuildCommands(guildId, force = false) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error(`Guild ${guildId} not found`);
        }

        const coreConfig = await this.client.coreConfig();
        if (!coreConfig["INTERACTIONS"]["SLASH"] && !coreConfig["INTERACTIONS"]["CONTEXT"]) {
            Logger.debug("Skipping command registration - no interactions enabled");
            return;
        }

        const toRegister = [];

        // Get enabled plugins for this guild
        let guildEnabledPlugins = [];
        const corePlugin = this.client.pluginManager.getPlugin("core");
        if (!force) {
            try {
                const guildSettings = await corePlugin.dbService.getSettings(guildId);
                guildEnabledPlugins = guildSettings.enabled_plugins || [];
            } catch (error) {
                Logger.debug(`Could not get enabled plugins for guild ${guild.name}:`, error);
            }
        }

        // Filter commands from enabled plugins
        if (coreConfig["INTERACTIONS"]["SLASH"]) {
            this.slashCommands
                .filter((cmd) => {
                    // Check if the plugin is globally enabled AND enabled for this guild
                    const plugin = cmd.plugin;
                    const isGloballyEnabled = this.client.pluginManager.isPluginEnabled(
                        plugin.name,
                    );

                    // If force is true or no enabled plugins are set, consider all plugins enabled for the guild
                    const isGuildEnabled =
                        force ||
                        guildEnabledPlugins.length === 0 ||
                        guildEnabledPlugins.includes(plugin.name);

                    return isGloballyEnabled && isGuildEnabled;
                })
                .map((cmd) => ({
                    name: cmd.name,
                    description: this.client.translate(cmd.description),
                    descriptionLocalizations: this.client.i18n.getAllTr(cmd.description),
                    type: ApplicationCommandType.ChatInput,
                    options: cmd.slashCommand.options?.map((opt) => {
                        if (opt.description) {
                            opt.description = this.client.translate(opt.description);
                            opt.descriptionLocalizations = this.client.i18n.getAllTr(
                                opt.description,
                            );
                        }
                        if (opt.options) {
                            opt.options = opt.options.map((o) => {
                                if (o.description) {
                                    o.description = this.client.translate(o.description);
                                    o.descriptionLocalizations = this.client.i18n.getAllTr(
                                        o.description,
                                    );
                                }
                                return o;
                            });
                        }
                        return opt;
                    }),
                }))
                .forEach((s) => toRegister.push(s));
        }

        // Filter context menus from enabled plugins
        if (coreConfig["INTERACTIONS"]["CONTEXT"]) {
            this.contextMenus
                .filter((ctx) => {
                    // Check if the plugin is globally enabled AND enabled for this guild
                    const plugin = ctx.plugin;
                    const isGloballyEnabled = this.client.pluginManager.isPluginEnabled(
                        plugin.name,
                    );

                    // If force is true or no enabled plugins are set, consider all plugins enabled for the guild
                    const isGuildEnabled =
                        force ||
                        guildEnabledPlugins.length === 0 ||
                        guildEnabledPlugins.includes(plugin.name);

                    return isGloballyEnabled && isGuildEnabled;
                })
                .map((ctx) => ({
                    name: ctx.name,
                    type: ctx.type,
                }))
                .forEach((c) => toRegister.push(c));
        }

        // Set the commands in the guild
        await guild.commands.set(toRegister);
        Logger.debug(
            `Registered ${toRegister.length} interactions in guild ${guild.name} (${guild.id})`,
        );
    }

    /**
     * Update commands when a plugin is enabled or disabled
     * @param {string} pluginName - The plugin name
     * @param {boolean} enabled - Whether the plugin is being enabled or disabled
     * @param {string|null} guildId - Guild ID if this is per-guild, null if global
     */
    async updatePluginStatus(pluginName, enabled, guildId = null) {
        try {
            if (guildId) {
                // Per-guild plugin status change
                Logger.debug(
                    `Plugin ${pluginName} ${enabled ? "enabled" : "disabled"} for guild ${guildId}`,
                );
                this.#queueGuildRegistration(guildId);
            } else {
                // Global plugin status change - need to update all guilds
                Logger.debug(`Plugin ${pluginName} ${enabled ? "enabled" : "disabled"} globally`);

                // Get all guilds where bot is present
                const guilds = this.client.guilds.cache.map((guild) => guild.id);

                // Queue updates with priority balancing
                guilds.forEach((guildId, index) => {
                    // Stagger the queuing to avoid overwhelming the system
                    setTimeout(() => {
                        this.#queueGuildRegistration(guildId);
                    }, index * 50); // Small delay between each queue addition
                });
            }

            // Start processing the queue but don't await its completion
            this.#processRegistrationQueue();
            return true;
        } catch (error) {
            Logger.error(`Failed to update plugin status for ${pluginName}:`, error);
            return false;
        }
    }

    /**
     * Get a summary of registered commands
     */
    getSummary() {
        return {
            prefixCommands: this.prefixCommands.size,
            slashCommands: this.slashCommands.size,
            contextMenus: this.contextMenus.size,
            userContexts: this.contextMenus.filter(
                (ctx) => ctx.type === ApplicationCommandType.User,
            ).size,
            messageContexts: this.contextMenus.filter(
                (ctx) => ctx.type === ApplicationCommandType.Message,
            ).size,
        };
    }
}

module.exports = CommandManager;
