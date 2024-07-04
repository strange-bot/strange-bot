const { ApplicationCommandOptionType } = require("discord.js");
const { setupCounter } = require("../handler");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "counter",
    description: "counter:CMD_DESC",
    userPermissions: ["ManageGuild"],
    botPermissions: ["ManageChannels"],
    command: {
        enabled: true,
        usage: "<type> <channel-name>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "type",
                description: "counter:TYPE_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "users",
                        value: "USERS",
                    },
                    {
                        name: "members",
                        value: "MEMBERS",
                    },
                    {
                        name: "bots",
                        value: "BOTS",
                    },
                ],
            },
            {
                name: "name",
                description: "counter:NAME_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const settings = message.guild.getSettings("counter");
        const type = args[0].toUpperCase();
        if (!type || !["USERS", "MEMBERS", "BOTS"].includes(type)) {
            return message.replyT("counter:INVALID_TYPE");
        }
        if (args.length < 2) return message.replyT("counter:INVALID_NAME");
        args.shift();
        let channelName = args.join(" ");

        const responseKey = await setupCounter(message.guild, type, channelName, settings);
        return message.replyT(responseKey);
    },

    async interactionRun(interaction) {
        const settings = interaction.guild.getSettings("counter");
        const type = interaction.options.getString("type");
        const name = interaction.options.getString("name");

        const responseKey = await setupCounter(
            interaction.guild,
            type.toUpperCase(),
            name,
            settings,
        );
        return interaction.followUpT(responseKey);
    },
};
