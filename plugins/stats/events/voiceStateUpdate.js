const { getMemberStats } = require("../schemas/MemberStats");
const VoiceLogs = require("../schemas/VoiceLogs");

const voiceStates = new Map();

/**
 * @param {import('discord.js').VoiceState} oldState
 * @param {import('discord.js').VoiceState} newState
 */
module.exports = async (oldState, newState) => {
    if (!newState.guild.getSettings("stats").enabled) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (!oldChannel && !newChannel) return;
    if (!newState.member) return;

    const now = Date.now();
    const member = await newState.member.fetch().catch(() => {});
    if (!member || member.user.bot) return;

    // Member joined a voice channel
    if (!oldChannel && newChannel) {
        const statsDb = await getMemberStats(member.guild.id, member.id);
        statsDb.voice.connections += 1;
        await statsDb.save();
        voiceStates.set(member.id, now);
    }

    // Member left a voice channel
    if (oldChannel && !newChannel) {
        const statsDb = await getMemberStats(member.guild.id, member.id);
        if (voiceStates.has(member.id)) {
            const time = now - voiceStates.get(member.id);
            statsDb.voice.time += time / 1000; // add time in seconds

            // Save Logs to DB
            await statsDb.save();
            await VoiceLogs.create({
                guild_id: member.guild.id,
                channel_id: oldChannel.id,
                member_id: member.id,
                connected_at: voiceStates.get(member.id),
                disconnected_at: now,
                connection_time: time,
            });
            voiceStates.delete(member.id);
        }
    }

    // TODO: Check this logic
    // Member switched voice channels
    if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        if (voiceStates.has(member.id)) {
            const time = now - voiceStates.get(member.id);

            // Save Logs to DB
            const statsDb = await getMemberStats(member.guild.id, member.id);
            statsDb.voice.time += time / 1000; // add time in seconds
            await statsDb.save();

            await VoiceLogs.create({
                guild_id: member.guild.id,
                channel_id: oldChannel.id,
                member_id: member.id,
                connected_at: voiceStates.get(member.id),
                disconnected_at: now,
                connection_time: time,
            });

            voiceStates.set(member.id, now);
        }
    }
};
