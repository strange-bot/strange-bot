declare global {
    declare module "discord.js" {
        interface Client {
            prefixCommands: import("discord.js").Collection<
                string,
                import("strange-sdk").CommandType
            >;
            slashCommands: import("discord.js").Collection<
                string,
                import("strange-sdk").CommandType
            >;
            contextMenus: import("discord.js").Collection<
                string,
                import("strange-sdk").ContextType
            >;

            logger: typeof import("strange-sdk/utils").Logger;
            pluginManager: import("apps/bot/helpers/PluginManager");

            translations: Map<string, import("i18next").TFunction> | undefined;
            i18n: import("strange-i18n") | undefined;

            wait: (ms: number) => Promise<void>;

            coreConfig(): Promise<object>;

            get defaultLanguage(): string;
            loadTranslations(): Promise<void>;
            translate(key: string, args?: Object, locale?: string): string;

            loadPluginCommands(): void;
            loadPluginContexts(): void;

            registerInteractions(guildId?: string): Promise<void>;
            resolveUsers(search: string, exact?: boolean): Promise<User[]>;
            getInvite(): string;
        }

        interface Guild {
            locale: string | undefined;
            getT(key: string, args?: Object): string;
            getEnabledPlugins(): Promise<string[]>;
            getSettings(pluginName: string): Promise<import("strange-db-client").Model | object>;
            canSendEmbeds(channel: import("discord.js").GuildChannel): boolean;
            findMatchingChannels(
                query: string,
                type?: import("discord.js").GuildChannelTypes[],
            ): import("discord.js").GuildChannel[];
            findMatchingRoles(query: string): import("discord.js").Role[];
            resolveMember(
                query: string,
                exact?: boolean,
            ): Promise<import("discord.js").GuildMember>;
        }

        interface Message {
            isCommand: boolean | undefined;
            commandName: string | undefined;

            replyT(key: string, args?: Object): Promise<Message | undefined>;
        }

        interface ChatInputCommandInteraction {
            followUpT(key: string, args?: Object): Promise<Message | undefined>;
        }

        interface ButtonInteraction {
            followUpT(key: string, args?: Object): Promise<Message | undefined>;
        }

        interface ContextMenuCommandInteraction {
            followUpT(key: string, args?: Object): Promise<Message | undefined>;
        }
    }
}
