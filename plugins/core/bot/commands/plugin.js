const {
    ApplicationCommandOptionType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChatInputCommandInteraction,
    ComponentType,
} = require("discord.js");
const DatabaseClient = require("strange-db-client");
const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "plugin",
    description: "core:PLUGIN.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "list",
                description: "core:PLUGIN.SUB_LIST",
            },
            {
                trigger: "info <plugin>",
                description: "core:PLUGIN.SUB_INFO",
            },
            {
                trigger: "status",
                description: "core:PLUGIN.SUB_STATUS",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "list",
                type: ApplicationCommandOptionType.Subcommand,
                description: "core:PLUGIN.SUB_LIST",
            },
            {
                name: "info",
                description: "core:PLUGIN.SUB_INFO",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "name",
                        description: "core:PLUGIN.SUB_OPT_NAME",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "status",
                description: "core:PLUGIN.SUB_STATUS",
                type: ApplicationCommandOptionType.Subcommand,
            },
        ],
    },

    async messageRun({ message, args }) {
        const [sub, plugin] = args;
        let resp;

        switch (sub?.toLowerCase()) {
            case "list":
                resp = await listPlugins(message);
                break;

            case "info":
                resp = await pluginInfo(message, plugin);
                break;

            case "status":
                return await pluginStatus(message);

            default:
                resp = message.guild.getT("INVALID_SUBCOMMAND", { sub });
                break;
        }

        await message.reply(resp);
    },

    async interactionRun({ interaction }) {
        const sub = interaction.options.getSubcommand();
        const plugin = interaction.options.getString("name");

        let resp;
        switch (sub.toLowerCase()) {
            case "list":
                resp = await listPlugins(interaction);
                break;

            case "info":
                resp = await pluginInfo(interaction, plugin);
                break;

            case "status":
                return await pluginStatus(interaction);
        }

        await interaction.followUp(resp);
    },
};

/**
 * @param {import('discord.js').Message | import('discord.js').CommandInteraction} arg0
 */
async function listPlugins({ client, guild }) {
    const plugins = client.pluginManager.plugins.filter((p) => !p.ownerOnly);
    const enabledPlugins = await guild.getEnabledPlugins();

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("core:PLUGIN.LIST_EMBED_TITLE") })
        .addFields(
            plugins.map((p) => {
                const status = enabledPlugins.includes(p.name)
                    ? guild.getT("core:PLUGIN.ENABLED")
                    : guild.getT("core:PLUGIN.DISABLED");
                return {
                    name: p.name,
                    value: status,
                    inline: true,
                };
            }),
        )
        .setFooter({
            text: guild.getT("core:PLUGIN.LIST_EMBED_FOOTER", { count: plugins.length }),
        });

    return { embeds: [embed] };
}

/**
 * @param {import('discord.js').Message | import('discord.js').CommandInteraction} arg0
 * @param {string} plugin
 */
async function pluginInfo({ client, guild }, plugin) {
    if (!plugin) return guild.getT("core:PLUGIN.INFO_MISSING_PLUGIN");

    const p = client.pluginManager.plugins
        .filter((p) => !p.ownerOnly)
        .find((p) => p.name === plugin);
    if (!p) return guild.getT("core:PLUGIN.NOT_FOUND", { plugin });
    const settings = await guild.getSettings(p.name);

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("core:PLUGIN.INFO_EMBED_TITLE", { plugin }) })
        .setDescription(
            guild.getT("core:PLUGIN.INFO_EMBED_DESC", {
                name: p.name,
                version: p.version,
                status: settings.enabled
                    ? guild.getT("core:PLUGIN.ENABLED")
                    : guild.getT("core:PLUGIN.DISABLED"),
                prefixCmds: [...p.commands].filter((c) => c.command.enabled).length,
                slashCmds: [...p.commands].filter((c) => c.slashCommand.enabled).length,
            }),
        );

    return { embeds: [embed] };
}

/**
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} arg0
 */
async function pluginStatus(arg0) {
    const { client, guild } = arg0;

    const options = [];
    for (const p of client.pluginManager.plugins.filter((p) => !p.ownerOnly)) {
        const settings = await guild.getSettings(p.name);
        options.push({
            label: p.name,
            value: p.name,
            default: settings.enabled ? true : false,
        });
    }

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("plugin-status-menu")
            .setPlaceholder(guild.getT("core:PLUGIN.STATUS_SELECT_PLACEHOLDER"))
            .addOptions(options)
            .setMaxValues(options.length),
    );

    let reply = {
        content: guild.getT("core:PLUGIN.STATUS_SELECT_PROMPT"),
        components: [menuRow],
    };
    let sentMsg =
        arg0 instanceof ChatInputCommandInteraction
            ? await arg0.followUp(reply)
            : await arg0.reply(reply);

    const waiter = await sentMsg.channel
        .awaitMessageComponent({
            filter: (i) => i.customId === "plugin-status-menu" && i.user.id === arg0.member.id,
            componentType: ComponentType.StringSelect,
            time: 60000,
            dispose: true,
        })
        .catch(() => {});

    if (!waiter) {
        reply = {
            content: guild.getT("core:PLUGIN.STATUS_SELECT_TIMEOUT"),
            components: [],
        };
        if (arg0 instanceof ChatInputCommandInteraction) return arg0.editReply(reply);
        else return sentMsg.edit(reply);
    }

    sentMsg = await waiter.update({
        content: guild.getT("core:PLUGIN.STATUS_SELECT_PROCESSING"),
        components: [],
    });

    const allSettings = await DatabaseClient.getInstance().getSettings(guild.id);
    const pluginUpdates = Object.entries(allSettings.plugins).map(([key, value]) => ({
        key,
        value: {
            ...value,
            enabled: key === "core" ? true : waiter.values.includes(key),
        },
    }));

    // Update settings for each plugin sequentially
    for (const plugin of pluginUpdates) {
        await guild.updateSettings(plugin.key, plugin.value);
    }

    await sentMsg.edit({
        content: guild.getT("core:PLUGIN.STATUS_SELECT_SUCCESS"),
        components: [],
    });
}
