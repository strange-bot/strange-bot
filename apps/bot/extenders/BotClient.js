const { Client, GatewayIntentBits, Partials } = require("discord.js");
const PluginManager = require("../helpers/PluginManager");
const CommandManager = require("../helpers/CommandManager");
const { I18nManager } = require("strange-core");
const { Logger } = require("strange-sdk/utils");
const path = require("node:path");

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
                GatewayIntentBits.GuildExpressions,
            ],
            partials: [Partials.User, Partials.Message, Partials.Reaction],
            allowedMentions: {
                repliedUser: false,
            },
            restRequestTimeout: 20000,
        });

        // Command Manager
        this.commandManager = new CommandManager(this);

        // Logger
        this.logger = Logger;

        // Plugin Manager
        this.pluginManager = new PluginManager(
            this,
            process.env.REGISTRY_PATH,
            process.env.PLUGINS_DIR,
        );

        // i18n stuff
        const baseDir = path.join(__dirname, "..", "locales");
        this.i18n = new I18nManager("bot", {
            baseDir,
            pluginsDir: process.env.PLUGINS_DIR,
            fallbackLng: this.defaultLanguage,
            useDatabase: process.env.NODE_ENV === "production",
        });
        this.translations = new Map();

        // Helper wait
        this.wait = require("util").promisify(setTimeout);
    }

    async coreConfig() {
        return this.pluginManager.getPlugin("core").getConfig();
    }

    get defaultLanguage() {
        return "en-US";
    }

    translate(key, args, locale) {
        return this.i18n.tr(key, args, locale || this.defaultLanguage);
    }

    /**
     * @param {string} search - The search string
     * @param {Boolean} exact - Whether to search for exact matches
     */
    async resolveUsers(search, exact = false) {
        if (!search || typeof search !== "string") return [];
        const users = [];

        // check if userId is passed
        const patternMatch = search.match(/(\d{17,20})/);
        if (patternMatch) {
            const id = patternMatch[1];
            try {
                const fetched = await this.users.fetch(id, { cache: true }); // check if mentions contains the ID
                if (fetched) {
                    users.push(fetched);
                    return users;
                }
            } catch (error) {
                this.logger.error(`Failed to fetch user by ID (${id}):`, error);
                return users;
            }
        }

        // check if exact tag is matched in cache
        if (exact) {
            const exactMatch = this.users.cache.find((user) => user.tag === search);
            if (exactMatch) users.push(exactMatch);
        } else {
            this.users.cache
                .filter((user) => user.tag === search)
                .forEach((match) => users.push(match));
        }

        // check matching username
        if (!exact) {
            this.users.cache
                .filter(
                    (x) =>
                        x.username.toLowerCase() === search.toLowerCase() ||
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
