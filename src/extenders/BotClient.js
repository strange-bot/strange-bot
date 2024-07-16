const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
} = require("discord.js");
const { initializeI18n, getAllTr } = require("../utils/i18n");
const PluginManager = require("../base/PluginManager");
const Settings = require("../base/Settings");
const { Logger } = require("strange-sdk/utils");

class BotClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildEmojisAndStickers,
            ],
            partials: [Partials.User, Partials.Message, Partials.Reaction],
            allowedMentions: {
                repliedUser: false,
            },
            restRequestTimeout: 20000,
        });

        this.languages = require("../locales/languages-meta.json");

        // Command Collections
        /**
         * @type {Collection<string, import("strange-sdk").CommandType>}
         */
        this.prefixCommands = new Collection();
        /**
         * @type {Collection<string, import("strange-sdk").CommandType>}
         */
        this.slashCommands = new Collection();
        /**
         * @type {Collection<string, import("strange-sdk").ContextType>}
         */
        this.contextMenus = new Collection();

        // Logger
        this.logger = Logger;

        // Plugin Manager
        this.pluginManager = PluginManager;

        // Settings
        this.settings = Settings;

        // Dashboard States
        this.dashboardStates = {};

        // Wait function
        this.wait = require("util").promisify(setTimeout);
    }

    /**
     * @returns {import("../../plugins/core/config")}
     */
    get coreConfig() {
        return this.pluginManager.getConfig("core");
    }

    get defaultLanguage() {
        return this.coreConfig.get("LOCALE").DEFAULT;
    }

    async loadTranslations() {
        this.translations = await initializeI18n(this.pluginManager.plugins);
    }

    translate(key, args, locale) {
        if (!locale) locale = this.defaultLanguage;
        const tFunction = this.translations.get(locale);
        if (!tFunction) throw "Invalid language set in data.";
        return tFunction(key, args);
    }

    /**
     * Load all commands from plugins
     */
    loadPluginCommands() {
        this.logger.info(`Loading commands...`);
        for (const plugin of PluginManager.plugins) {
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
                    this.logger.debug(`Skipping slash command ${cmd.name}. Disabled!`);
                }
            }
        }

        this.logger.success(`Loaded ${this.prefixCommands.size} commands`);
        this.logger.success(`Loaded ${this.slashCommands.size} slash commands`);
    }

    /**
     * Load all contexts from plugins
     */
    loadPluginContexts() {
        this.logger.info(`Loading contexts...`);
        for (const plugin of PluginManager.plugins) {
            for (const ctx of plugin.contexts) {
                if (this.contextMenus.has(ctx.name))
                    throw new Error(`Context ${ctx.name} already registered`);
                this.contextMenus.set(ctx.name, ctx);
            }
        }

        const userContexts = this.contextMenus.filter(
            (ctx) => ctx.type === ApplicationCommandType.User,
        ).size;
        const messageContexts = this.contextMenus.filter(
            (ctx) => ctx.type === ApplicationCommandType.Message,
        ).size;

        if (userContexts > 3) throw new Error("A maximum of 3 USER contexts can be enabled");
        if (messageContexts > 3) throw new Error("A maximum of 3 MESSAGE contexts can be enabled");

        this.logger.success(`Loaded ${userContexts} USER contexts`);
        this.logger.success(`Loaded ${messageContexts} MESSAGE contexts`);
    }

    /**
     * Register slash command on startup
     * @param {string} [guildId]
     */
    async registerInteractions(guildId) {
        const toRegister = [];

        // filter slash commands
        if (this.coreConfig.get("INTERACTIONS").SLASH) {
            this.slashCommands
                .map((cmd) => ({
                    name: cmd.name,
                    description: this.translate(cmd.description),
                    descriptionLocalizations: getAllTr(cmd.description),
                    type: ApplicationCommandType.ChatInput,
                    // options: cmd.slashCommand.options,
                    options: cmd.slashCommand.options?.map((opt) => {
                        if (opt.description) {
                            opt.description = this.translate(opt.description);
                            opt.descriptionLocalizations = getAllTr(opt.description);
                        }
                        if (opt.options) {
                            opt.options = opt.options.map((o) => {
                                if (o.description) {
                                    o.description = this.translate(o.description);
                                    o.descriptionLocalizations = getAllTr(o.description);
                                }
                                return o;
                            });
                        }
                        return opt;
                    }),
                }))
                .forEach((s) => toRegister.push(s));
        }

        // filter contexts
        if (this.coreConfig.get("INTERACTIONS").CONTEXT) {
            this.contextMenus
                .map((ctx) => ({
                    name: ctx.name,
                    type: ctx.type,
                }))
                .forEach((c) => toRegister.push(c));
        }

        // Register for a specific guild
        if (guildId && typeof guildId === "string") {
            const guild = this.guilds.cache.get(guildId);
            if (!guild) {
                this.logger.error(
                    `Failed to register interactions in guild ${guildId}`,
                    new Error("No matching guild"),
                );
                return;
            }
            await guild.commands.set(toRegister);
            this.logger.debug(`Registered interactions in guild ${guild.name}`);
        }

        // Throw an error
        else {
            throw new Error("Did you provide a valid guildId to register interactions");
        }
    }

    /**
     * @param {string} search
     * @param {Boolean} exact
     */
    async resolveUsers(search, exact = false) {
        if (!search || typeof search !== "string") return [];
        const users = [];

        // check if userId is passed
        const patternMatch = search.match(/(\d{17,20})/);
        if (patternMatch) {
            const id = patternMatch[1];
            const fetched = await this.users.fetch(id, { cache: true }).catch(() => {}); // check if mentions contains the ID
            if (fetched) {
                users.push(fetched);
                return users;
            }
        }

        // check if exact tag is matched in cache
        const matchingTags = this.users.cache.filter((user) => user.tag === search);
        if (exact && matchingTags.size === 1) users.push(matchingTags.first());
        else matchingTags.forEach((match) => users.push(match));

        // check matching username
        if (!exact) {
            this.users.cache
                .filter(
                    (x) =>
                        x.username === search ||
                        x.username.toLowerCase().includes(search.toLowerCase()) ||
                        x.tag.toLowerCase().includes(search.toLowerCase()),
                )
                .forEach((user) => users.push(user));
        }

        return users;
    }

    /**
     * Get bot's invite
     */
    getInvite() {
        return this.generateInvite({
            scopes: ["bot", "applications.commands"],
            permissions: [
                "AddReactions",
                "AttachFiles",
                "BanMembers",
                "ChangeNickname",
                "Connect",
                "DeafenMembers",
                "EmbedLinks",
                "KickMembers",
                "ManageChannels",
                "ManageGuild",
                "ManageMessages",
                "ManageNicknames",
                "ManageRoles",
                "ModerateMembers",
                "MoveMembers",
                "MuteMembers",
                "PrioritySpeaker",
                "ReadMessageHistory",
                "SendMessages",
                "SendMessagesInThreads",
                "Speak",
                "ViewChannel",
                "ViewAuditLog",
            ],
        });
    }
}

module.exports = BotClient;
