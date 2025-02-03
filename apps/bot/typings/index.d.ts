declare global {

    declare module 'discord.js' {

        interface Client {

            public prefixCommands: import('discord.js').Collection<string, import('strange-sdk').CommandType>;
            public slashCommands: import('discord.js').Collection<string, import('strange-sdk').CommandType>;
            public contextMenus: import('discord.js').Collection<string, import('strange-sdk').ContextType>;

            public logger: typeof import('strange-sdk/utils').Logger;
            public pluginManager : import('apps/bot/helpers/PluginManager');

            public translations: Map<string, import('i18next').TFunction> | undefined;
            public i8next: import('strange-i18n') | undefined;

            public wait: (ms: number) => Promise<void>;

            public coreConfig(): Promise<object>;
            public defaultLanguage(): Promise<string>;

            public loadTranslations(): Promise<void>;
            public translate(key: string, args?: Object, locale?: string): string;

            public loadPluginCommands(): void;
            public loadPluginContexts(): void;
            
            public registerInteractions(guildId?: string): Promise<void>;
            public resolveUsers(search: string, exact?: boolean): Promise<User[]>;
            public getInvite(): string;
        }
        
        interface Guild {
            public getT(key: string, args?: Object): string;
            public getEnabledPlugins(): Promise<string[]>;
            public getSettings(pluginName: string): Promise<any>;
            public updateSettings(pluginName: string, settings: any): Promise<void>;
            public findMatchingChannels(query: string, type?: GuildChannelTypes[]): GuildBasedChannel[];
            public findMatchingRoles(query: string): Role[];
            public resolveMember(query: string, exact?: boolean): Promise<GuildMember>;
        }

        interface GuildChannel {
            public canSendEmbeds(): boolean;
            public safeSend(content: string | MessagePayload | MessageOptions): Promise<Message|undefined>;
        }

        interface Message {
            public isCommand: boolean | undefined;
            public commandName: string | undefined;
            
            public safeReply(options: string | MessagePayload | MessageReplyOptions): Promise<Message|undefined>;
            public replyT(key: string, args?: Object): Promise<Message|undefined>;
        }

        interface ChatInputCommandInteraction  {
            public followUpT(key: string, args?: Object): Promise<Message|undefined>;
        }

        interface ContextMenuCommandInteraction {
            public followUpT(key: string, args?: Object): Promise<Message|undefined>;
        }
    }
}

