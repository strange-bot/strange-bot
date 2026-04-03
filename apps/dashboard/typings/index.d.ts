import "express";
import "express-session";
import "discord-oauth2";
import { Document } from "nexord-db-client";
import { SaveableConfig } from "nexord-sdk";

declare global {
    namespace Express {
        interface Application {
            ipcClient: import("../helpers/IPCClient");
            pluginManager: import("../helpers/PluginManager");
            i18n: import("nexord-core").I18nManager;
            logger: typeof import("nexord-sdk/utils").Logger;
            translations: Map<string, import("i18next").TFunction>;
        }

        interface Locals {
            [key: string]: any;

            // Base Context
            coreConfig: import("nexord-sdk").SaveableConfig | undefined;
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
            plugins: import("nexord-sdk").DashboardPlugin[];
            plugin: import("nexord-sdk").DashboardPlugin;
            pluginCmds: import("nexord-sdk").DashboardCommand[];
            pluginCmds: any;
            config: SaveableConfig;
            settings: import("nexord-db-client").Document | null;
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
        broadcast: (event: string, data: any, options: object) => Promise<any[]>;
        broadcastOne: (event: string, data: any, options: object) => Promise<any>;
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
