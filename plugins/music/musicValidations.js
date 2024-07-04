module.exports = [
    {
        callback: ({ client, guildId }) => client.musicManager.getPlayer(guildId),
        message: "music:VALIDATION.NOT_PLAYING",
    },
    {
        callback: ({ member }) => member.voice?.channelId,
        message: "music:VALIDATION.NO_VOICE",
    },
    {
        callback: ({ member, client, guildId }) =>
            member.voice?.channelId === client.musicManager.getPlayer(guildId)?.channelId,
        message: "music:VALIDATION.DIFF_CHANNEL",
    },
];
