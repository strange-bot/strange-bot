const { ApplicationCommandType } = require("discord.js");
const avatarInfo = require("../commands/shared/avatar");

/**
 * @type {import("typings").ContextType}
 */
module.exports = {
    name: "avatar",
    description: "information:INFO.SUB_AVATAR_DESC",
    type: ApplicationCommandType.User,
    enabled: true,
    ephemeral: true,

    async run(interaction) {
        const user = await interaction.client.users.fetch(interaction.targetId);
        const response = avatarInfo(interaction.guild, user);
        await interaction.followUp(response);
    },
};
