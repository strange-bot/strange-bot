import BotUtils from "../lib/utils/BotUtils";
import channelTypes from "../lib/utils/channelTypes";
import EmbedUtils from "../lib/utils/EmbedUtils";
import HttpUtils from "../lib/utils/HttpUtils";
import Logger from "../lib/utils/Logger";
import MiscUtils from "../lib/utils/MiscUtils";
import permissions from "../lib/utils/permissions";
import { Schema, SchemaTypes } from "strange-db-client";

export interface Utils {
    BotUtils: typeof BotUtils;
    channelTypes: typeof channelTypes;
    EmbedUtils: typeof EmbedUtils;
    HttpUtils: typeof HttpUtils;
    Logger: typeof Logger;
    MiscUtils: typeof MiscUtils;
    permissions: typeof permissions;
}

export * from "./BotPlugin";
export * from "./Config";
export * from "./DashboardPlugin";
export * from "./DBService";
export { Schema, SchemaTypes };
