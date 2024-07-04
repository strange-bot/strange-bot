const {
    ApplicationCommandOptionType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "ticketcat",
    description: "ticket:CATEGORY.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "list",
                description: "ticket:CATEGORY.SUB_LIST_DESC",
            },
            {
                trigger: "add <category> | <description>",
                description: "ticket:CATEGORY.SUB_ADD_DESC",
            },
            {
                trigger: "remove <category>",
                description: "ticket:CATEGORY.SUB_REMOVE_DESC",
            },
            {
                trigger: "config <category>",
                description: "ticket:CATEGORY.SUB_CONFIG_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "list",
                description: "ticket:CATEGORY.SUB_LIST_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "add",
                description: "ticket:CATEGORY.SUB_ADD_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "category",
                        description: "ticket:CATEGORY.SUB_ADD_CAT_NAME",
                        type: ApplicationCommandOptionType.String,
                        maxLength: 100,
                        required: true,
                    },
                    {
                        name: "description",
                        description: "ticket:CATEGORY.SUB_ADD_CAT_DESC",
                        type: ApplicationCommandOptionType.String,
                        maxLength: 100,
                        required: true,
                    },
                ],
            },
            {
                name: "remove",
                description: "ticket:CATEGORY.SUB_REMOVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "category",
                        description: "ticket:CATEGORY.SUB_REMOVE_CAT_NAME",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "config",
                description: "ticket:CATEGORY.SUB_CONFIG_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "category",
                        description: "ticket:CATEGORY.SUB_CONFIG_CAT_NAME",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0].toLowerCase();
        const settings = message.guild.getSettings("ticket");
        let response;

        // list
        if (sub === "list") {
            response = listCategories(message, settings);
        }

        // add
        else if (sub === "add") {
            const split = args.slice(1).join(" ").split("|");
            const category = split[0].trim();
            const description = split[1]?.trim();
            response = await addCategory(message, settings, category, description);
        }

        // remove
        else if (sub === "remove") {
            const category = args.slice(1).join(" ").trim();
            response = await removeCategory(message, settings, category);
        }

        // config
        else if (sub === "config") {
            const category = args.slice(1).join(" ").trim();
            response = await configCategory(message, settings, category);
        }

        // invalid subcommand
        else {
            response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });
        }

        if (response) await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("ticket");
        let response;

        // list
        if (sub === "list") {
            response = listCategories(interaction, settings);
        }

        // add
        else if (sub === "add") {
            const name = interaction.options.getString("category");
            const description = interaction.options.getString("description");
            response = await addCategory(interaction, settings, name, description);
        }

        // remove
        else if (sub === "remove") {
            const category = interaction.options.getString("category");
            response = await removeCategory(interaction, settings, category);
        }

        // config
        else if (sub === "config") {
            const category = interaction.options.getString("category");
            response = await configCategory(interaction, settings, category);
        }

        await interaction.followUp(response);
    },
};

function listCategories({ guild }, settings) {
    const categories = settings.categories;
    if (categories?.length === 0) return guild.getT("ticket:CATEGORY.LIST_EMPTY");

    const fields = [];
    for (const category of categories) {
        const staffNames = category.staff_roles.map((r) => `<@&${r}>`).join(", ");
        const memNames = category.member_roles.map((r) => `<@&${r}>`).join(", ");
        fields.push({
            name: category.name,
            value: `**Staff Roles:** ${staffNames || "None"}\n**Member Roles:** ${memNames || "None"}`,
            inline: true,
        });
    }
    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("ticket:CATEGORY.LIST_EMBED_TITLE") })
        .addFields(fields);

    return { embeds: [embed] };
}

async function addCategory({ guild }, settings, category, description) {
    if (!category) return guild.getT("ticket:CATEGORY.ADD_NO_NAME");

    // check if category already exists
    if (settings.categories.find((c) => c.name === category)) {
        return guild.getT("ticket:CATEGORY.ADD_EXISTS", { category });
    }

    settings.categories.push({ name: category, description });
    await guild.updateSettings();

    return guild.getT("ticket:CATEGORY.ADD_SUCCESS", { category });
}

async function removeCategory({ guild }, settings, category) {
    const categories = settings.categories;

    // check if category exists
    if (!categories.find((c) => c.name === category)) {
        return guild.getT("ticket:CATEGORY.REMOVE_NOT_EXISTS", { category });
    }

    settings.categories = categories.filter((c) => c.name !== category);
    await guild.updateSettings();

    return guild.getT("ticket:CATEGORY.REMOVE_SUCCESS", { category });
}

async function configCategory(arg0, settings, category) {
    const { guild } = arg0;
    const cat = settings.categories.find((c) => c.name === category);

    if (!cat) {
        return guild.getT("ticket:CATEGORY.CONFIG_NOT_EXISTS", { category });
    }

    const reply = {
        content: guild.getT("ticket:CATEGORY.CONFIG_CONTENT", { category }),
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket:btn_tc_memRole")
                    .setLabel(guild.getT("ticket:CATEGORY.CONFIG_BTN_MEM_ROLE"))
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("ticket:btn_tc_staffRole")
                    .setLabel(guild.getT("ticket:CATEGORY.CONFIG_BTN_STAFF_ROLE"))
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("ticket:btn_tc_msg")
                    .setLabel(guild.getT("ticket:CATEGORY.CONFIG_BTN_MSG"))
                    .setStyle(ButtonStyle.Secondary),
            ),
        ],
    };

    /**
     * @type {Message}
     */
    const sentMsg = arg0 instanceof Message ? await arg0.reply(reply) : await arg0.followUp(reply);
    const authorId = arg0 instanceof Message ? arg0.author.id : arg0.user.id;
    const collector = sentMsg.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === authorId && i.message.id === sentMsg.id,
        time: 2 * 60 * 1000,
    });

    collector.on("end", () => {
        if (sentMsg && sentMsg.editable)
            sentMsg.edit({ content: "> Timeout", components: [] }).catch((ex) => {});
    });

    collector.on("collect", async (response) => {
        // member role modal
        if (response.customId === "ticket:btn_tc_memRole") {
            response.showModal(
                new ModalBuilder({
                    title: guild.getT("ticket:CATEGORY.CONFIG_MODAL_MEM_ROLE_TITLE"),
                    customId: "ticket:modal_tc_memRole",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("role_add")
                                .setLabel(guild.getT("ticket:CATEGORY.CONFIG_MODAL_MEM_ROLE_ADD"))
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ]),
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("role_remove")
                                .setLabel(
                                    guild.getT("ticket:CATEGORY.CONFIG_MODAL_MEM_ROLE_REMOVE"),
                                )
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ]),
                    ],
                }),
            );
        }

        // staff role modal
        else if (response.customId === "ticket:btn_tc_staffRole") {
            response.showModal(
                new ModalBuilder({
                    title: guild.getT("ticket:CATEGORY.CONFIG_MODAL_STAFF_ROLE_TITLE"),
                    customId: "ticket:modal_tc_manRole",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("role_add")
                                .setLabel(guild.getT("ticket:CATEGORY.CONFIG_MODAL_STAFF_ROLE_ADD"))
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ]),
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("role_remove")
                                .setLabel(
                                    guild.getT("ticket:CATEGORY.CONFIG_MODAL_STAFF_ROLE_REMOVE"),
                                )
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ]),
                    ],
                }),
            );
        }

        // message config modal
        else if (response.customId === "ticket:btn_tc_msg") {
            await response.showModal(
                new ModalBuilder()
                    .setTitle(guild.getT("ticket:CATEGORY.CONFIG_MODAL_MSG_TITLE"))
                    .setCustomId("ticket:modal_tc_msg")
                    .addComponents(
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("title")
                                .setLabel(
                                    guild.getT("ticket:CATEGORY.CONFIG_MODAL_MSG_EMBED_TITLE"),
                                )
                                .setStyle(TextInputStyle.Short),
                        ]),
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("description")
                                .setLabel(guild.getT("ticket:CATEGORY.CONFIG_MODAL_MSG_EMBED_DESC"))
                                .setStyle(TextInputStyle.Paragraph),
                        ]),
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("footer")
                                .setLabel(
                                    guild.getT("ticket:CATEGORY.CONFIG_MODAL_MSG_EMBED_FOOTER"),
                                )
                                .setStyle(TextInputStyle.Short),
                        ]),
                    ),
            );
        }

        const modal = await response
            .awaitModalSubmit({
                time: 60 * 1000,
                filter: (m) => m.message.id === sentMsg.id,
            })
            .catch(() => {});

        if (!modal) return;
        await modal.deferReply({ ephemeral: true }).catch(() => {});

        // member role
        if (modal.customId === "ticket:modal_tc_memRole") {
            const roleAdd = modal.fields.getTextInputValue("role_add");
            const roleRemove = modal.fields.getTextInputValue("role_remove");

            if (roleAdd) {
                if (!modal.guild.roles.cache.has(roleAdd)) {
                    return modal.followUp(
                        guild.getT("ticket:CATEGORY.CONFIG_ROLE_NOT_EXIST", { role: roleAdd }),
                    );
                }
                if (!cat.member_roles.includes(roleAdd)) cat.member_roles.push(roleAdd);
            }

            if (roleRemove) {
                if (!modal.guild.roles.cache.has(roleRemove)) {
                    return modal.followUp(
                        guild.getT("ticket:CATEGORY.CONFIG_ROLE_NOT_EXIST", { role: roleRemove }),
                    );
                }
                cat.member_roles.splice(cat.member_roles.indexOf(roleRemove), 1);
            }

            await guild.updateSettings();
            await modal.followUp(guild.getT("ticket:CATEGORY.CONFIG_MEM_ROLE_SUCCESS"));
        }

        // staff role
        else if (modal.customId === "ticket:modal_tc_manRole") {
            const roleAdd = modal.fields.getTextInputValue("role_add");
            const roleRemove = modal.fields.getTextInputValue("role_remove");

            if (roleAdd) {
                if (!modal.guild.roles.cache.has(roleAdd)) {
                    return modal.followUp(
                        guild.getT("ticket:CATEGORY.CONFIG_ROLE_NOT_EXIST", { role: roleAdd }),
                    );
                }
                if (!cat.staff_roles.includes(roleAdd)) cat.staff_roles.push(roleAdd);
            }

            if (roleRemove) {
                if (!modal.guild.roles.cache.has(roleRemove)) {
                    return modal.followUp(
                        guild.getT("ticket:CATEGORY.CONFIG_ROLE_NOT_EXIST", { role: roleRemove }),
                    );
                }
                cat.staff_roles.splice(cat.staff_roles.indexOf(roleRemove), 1);
            }

            await guild.updateSettings();
            await modal.followUp(guild.getT("ticket:CATEGORY.CONFIG_STAFF_ROLE_SUCCESS"));
        }

        // message config
        else if (modal.customId === "ticket:modal_tc_msg") {
            const title = modal.fields.getTextInputValue("title");
            const description = modal.fields.getTextInputValue("description");
            const footer = modal.fields.getTextInputValue("footer");

            cat.open_msg = {
                title,
                description,
                footer,
            };
            await guild.updateSettings();
            await modal.followUp(guild.getT("ticket:CATEGORY.CONFIG_MSG_SUCCESS"));
        }
    });
}
