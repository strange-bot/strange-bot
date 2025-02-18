import "express";
import "express-session";
import "discord-oauth2";
import { DBClient, Document } from "strange-db-client";

declare global {
    namespace Express {
        interface Application {
            db: DBClient;
            ipcServer: import("../helpers/IPCServer");
            pluginManager: import("../helpers/PluginManager");
            i18n: import("strange-i18n");
            translations: Map<string, import("i18next").TFunction>;
        }
    }
}

declare module "express" {
    export interface Request {
        logger: typeof import("strange-sdk/utils").Logger;
        translate: import("i18next").TFunction;
        broadcast: (event: string, data: any) => Promise<any[]>;
    }

    export interface Response {
        locals: {
            [key: string]: any;

            // Base Context
            coreConfig: import("strange-sdk").SaveableConfig | undefined;
            languages:
                | Array<{
                      name: string;
                      nativeName: string;
                      discord: string;
                      svg_code: string;
                      aliases: string[];
                  }>
                | undefined;
            locale: string | undefined;

            // Guild Context
            guild: import("discord-oauth2").PartialGuild & {
                getSettings: (pluginName: string) => Promise<Document | null>;
            };

            // Plugin Context
            tr: import("i18next").TFunction;
            coreSettings: Document | null;
            user: SessionUser | undefined;
            plugins: import("strange-sdk").DashboardPlugin[] | undefined;
            plugin: import("strange-sdk").DashboardPlugin | undefined;
            pluginCmds: import("strange-sdk").DashboardCommand[] | undefined;
            pluginCmds: any | undefined;
            config: SaveableConfig | undefined;
            settings: Document | null;
            title: string | undefined;
            slug: string | undefined;
            layout: string | undefined;
            breadcrumb: string | undefined;
        };
    }
}

interface SessionUser {
    info: import("discord-oauth2").User & {
        isOwner?: boolean;
    };
    guilds: import("discord-oauth2").PartialGuild[];
}

declare module "express-session" {
    export interface SessionData {
        user: SessionUser | undefined;
        locale: string;
    }
}
