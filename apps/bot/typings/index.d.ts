declare global {
    declare module "discord.js" {
        interface Client {
            commandManager: import("apps/bot/helpers/CommandManager");

            logger: typeof import("strange-sdk/utils").Logger;
            pluginManager: import("apps/bot/helpers/PluginManager");

            i18n: import("strange-core").I18nManager;
            translations: Map<string, import("i18next").TFunction>;

            wait: (ms: number) => Promise<void>;

            coreConfig(): Promise<object>;

            get defaultLanguage(): string;
            translate(key: string, args?: Object, locale?: string): string;

            resolveUsers(search: string, exact?: boolean): Promise<User[]>;
            getInvite(): string;
        }

        interface Guild {
            locale: string | undefined;
            getT(key: string, args?: Object): string;
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
