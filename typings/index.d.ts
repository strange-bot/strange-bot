declare global {

    declare module 'discord.js' {

        interface Client {
            public languages: Array<Object>;

            public prefixCommands: import('discord.js').Collection<string, CommandType>;
            public slashCommands: import('discord.js').Collection<string, CommandType>;
            public contextMenus: import('discord.js').Collection<string, ContextType>;

            public logger: typeof import('src/utils/Logger');
            public pluginManager : typeof import('src/base/PluginManager');
            public settings: typeof import('src/base/Settings');

            public dashboardStates: Object;
            public wait(time: number): Promise<void>;
            public translations: Map<string, import('i18next').TFunction> | undefined;

            get coreConfig(): typeof import('plugins/core/config');
            get defaultLanguage(): string;
            public loadTranslations(): Promise<void>;
            public translate(key: string, args?: Object, locale?: string): string;
            public loadPluginCommands(): void;
            public loadPluginContexts(): void;
            public registerInteractions(guildId?: string): Promise<void>;
            public resolveUsers(search: string, exact?: boolean): Promise<User[]>;
            public getInvite(): string;
        }
        
        interface Guild {
            public getSettings(pluginName: string): Object;
            public updateSettings(): Promise<void>;
            public getT(key: string, args?: Object): string;
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

    namespace Express {
        interface Request {
            user: RequestUser | undefined;
            client: import("discord.js").Client;
            translate: import("i18next").TFunction;
        }
    }
}

declare module "express-session" {
    export interface SessionData {
        user: SessionUser | undefined;
        locale: string;
    }
}

type SessionUser = {
    infos: import("discord-oauth2").User;
    guilds: import("discord-oauth2").PartialGuild[];
};

type RequestUser = {
    infos: import("discord.js").User;
    guilds: ExtendedPartialGuild[];
};

type ExtendedPartialGuild = import("discord-oauth2").PartialGuild & {
    admin: boolean;
    settingsUrl: string;
    iconURL: string;
};
