import "express";
import "express-session";
import "discord-oauth2";

declare global {
    namespace Express {
        interface Application {
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
    }
}

declare module "express-session" {
    export interface SessionData {
        user:
            | {
                  info: import("discord-oauth2").User;
                  guilds: import("discord-oauth2").PartialGuild[];
              }
            | undefined;
        locale: string;
    }
}
