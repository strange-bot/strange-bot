import { Router } from "express";
import { Model } from "mongoose";
import {
    Guild,
    Message,
    ApplicationCommandOptionData,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    PermissionResolvable,
    ContextMenuCommandInteraction,
    Client,
} from "discord.js";

import BotPlugin, { BotPluginData } from "../lib/BotPlugin";
import DashboardPlugin, { DashboardPluginData } from "../lib/DashboardPlugin";
import PluginConfig from "../lib/PluginConfig";
import BotUtils from "../lib/utils/BotUtils";
import channelTypes from "../lib/utils/channelTypes";
import EmbedUtils from "../lib/utils/EmbedUtils";
import HttpUtils from "../lib/utils/HttpUtils";
import Logger from "../lib/utils/Logger";
import MiscUtils from "../lib/utils/MiscUtils";
import permissions from "../lib/utils/permissions";

export { BotPlugin, BotPluginData, DashboardPlugin, DashboardPluginData, PluginConfig };

export interface Utils {
    BotUtils: typeof BotUtils;
    channelTypes: typeof channelTypes;
    EmbedUtils: typeof EmbedUtils;
    HttpUtils: typeof HttpUtils;
    Logger: typeof Logger;
    MiscUtils: typeof MiscUtils;
    permissions: typeof permissions;
}

export type CommandContext = {
    message: Message;
    prefix: string;
    invoke: string;
    args: string[];
};

export type ChatInputCommandInteractionContext = {
    interaction: ChatInputCommandInteraction;
};

export type CommandType = {
    /**
     * The name of the command
     */
    name: string;
    /**
     * A short description of the command
     */
    description: string;
    /**
     * Whether the command is enabled or not
     */
    enabled: boolean;
    /**
     * The command cooldown in seconds (0 for no cooldown)
     */
    cooldown?: number;
    /**
     * Permissions required by the client to use the command.
     */
    botPermissions?: PermissionResolvable[];
    /**
     * Permissions required by the user to use the command
     */
    userPermissions?: PermissionResolvable[];
    /**
     * List of validation functions to run before executing the command
     */
    validations?: {
        /**
         * The validation function
         */
        callback: (message: Message | ChatInputCommandInteraction) => boolean;
        /**
         * The error message to send if the validation fails
         */
        message: string;
    }[];
    /**
     * Prefix command properties
     */
    command: {
        /**
         * Whether the prefix command is enabled or not
         */
        enabled: boolean;
        /**
         * Alternative names for the command (all must be lowercase)
         */
        aliases?: string[];
        /**
         * The command usage format string
         */
        usage?: string;
        /**
         * Minimum number of arguments the command takes (default is 0)
         */
        minArgsCount: number;
        /**
         * List of subcommands
         */
        subcommands: {
            /**
             * The name of the subcommand
             */
            trigger: string;
            /**
             * A short description of the subcommand
             */
            description: string;
        }[];
    };
    /**
     * Slash command properties
     */
    slashCommand: {
        /**
         * Whether the slash command is enabled or not
         */
        enabled: boolean;
        /**
         * Whether the reply should be ephemeral
         */
        ephemeral?: boolean;
        /**
         * The command options
         */
        options: ApplicationCommandOptionData[];
    };

    plugin?: BotPlugin;
    messageRun(ctx: CommandContext): Promise<any>;
    interactionRun(ctx: ChatInputCommandInteractionContext): Promise<any>;
};

export type ContextMenuCommandInteractionContext = {
    interaction: ContextMenuCommandInteraction;
};

export type ContextType = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * A short description of the context
     */
    description: string;
    /**
     * The type of application command
     */
    type: ApplicationCommandType;
    /**
     * Whether the context is enabled or not
     */
    enabled?: boolean;
    /**
     * Whether the reply should be ephemeral
     */
    ephemeral?: boolean;
    /**
     * Permissions required by the user to use the command.
     */
    userPermissions?: PermissionResolvable[];
    /**
     * Command cooldown in seconds
     */
    cooldown?: number;
    /**
     * The callback to be executed when the context is invoked
     */
    run(ctx: ContextMenuCommandInteractionContext): Promise<any>;
};
