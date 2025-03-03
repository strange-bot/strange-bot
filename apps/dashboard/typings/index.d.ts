import "express";
import "express-session";
import "discord-oauth2";
import { Document } from "strange-db-client";
import { SaveableConfig } from "strange-sdk";

declare global {
    namespace Express {
        interface Application {
            ipcServer: import("../helpers/IPCServer");
            pluginManager: import("../helpers/PluginManager");
            i18n: import("strange-core").I18nManager;
            logger: typeof import("strange-sdk/utils").Logger;
            translations: Map<string, import("i18next").TFunction>;
        }

        interface Locals {
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
            user: SessionUser;
            plugins: import("strange-sdk").DashboardPlugin[];
            plugin: import("strange-sdk").DashboardPlugin;
            pluginCmds: import("strange-sdk").DashboardCommand[];
            pluginCmds: any;
            config: SaveableConfig;
            settings: import("strange-db-client").Document | null;
            title: string;
            slug: string;
            layout: string;
            breadcrumb: string;
        }
    }
}

declare module "express" {
    export interface Request {
        translate: import("i18next").TFunction;
        broadcast: (event: string, data: any) => Promise<any[]>;
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
