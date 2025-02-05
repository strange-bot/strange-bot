/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "ping",
    description: "core:PING.DESCRIPTION",
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [],
    },

    async messageRun({ message }) {
        await message.replyT("core:PING.RESPONSE", { ping: Math.floor(message.client.ws.ping) });
    },

    async interactionRun({ interaction }) {
        await interaction.followUpT("core:PING.RESPONSE", {
            ping: Math.floor(interaction.client.ws.ping),
        });
    },
};
