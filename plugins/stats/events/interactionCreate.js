const { getMemberStats } = require("../schemas/MemberStats");
const InteractionLogs = require("../schemas/InteractionLogs");

/**
 * @param {import('discord.js').BaseInteraction} interaction
 */
module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.guild.getSettings("stats").enabled) return;

    const statsDb = await getMemberStats(interaction.guildId, interaction.member.id);

    if (interaction.isChatInputCommand()) statsDb.commands.slash += 1;
    if (interaction.isUserContextMenuCommand()) statsDb.contexts.user += 1;
    if (interaction.isMessageContextMenuCommand()) statsDb.contexts.message += 1;

    // Log to DB
    InteractionLogs.create({
        guild_id: interaction.guildId,
        channel_id: interaction.channelId,
        member_id: interaction.member.id,
        is_slash: interaction.isChatInputCommand(),
        cmd_name: interaction.commandName,
        is_user_context: interaction.isUserContextMenuCommand(),
        is_message_context: interaction.isMessageContextMenuCommand(),
    });

    await statsDb.save();
};
