const { ApplicationCommandOptionType } = require("discord.js");

const discordTogether = [
    "askaway",
    "awkword",
    "betrayal",
    "bobble",
    "checkers",
    "chess",
    "chessdev",
    "doodlecrew",
    "fishing",
    "land",
    "lettertile",
    "meme",
    "ocho",
    "poker",
    "puttparty",
    "puttpartyqa",
    "sketchheads",
    "sketchyartist",
    "spellcast",
    "wordsnack",
    "youtube",
    "youtubedev",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "together",
    description: "fun:TOGETHER.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        aliases: ["discordtogether"],
        usage: "<game>",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "type",
                description: "fun:TOGETHER.TYPE_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: discordTogether.map((game) => ({ name: game, value: game })),
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0];
        const response = await getTogetherInvite(message.member, input);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const choice = interaction.options.getString("type");
        const response = await getTogetherInvite(interaction.member, choice);
        await interaction.followUp(response);
    },
};

async function getTogetherInvite(member, choice) {
    choice = choice.toLowerCase();

    const vc = member.voice.channel?.id;
    if (!vc) member.guild.getT("fun:TOGETHER.NO_VOICE_CHANNEL");

    if (!discordTogether.includes(choice)) {
        return member.guild.getT("fun:TOGETHER.INVALID_GAME", {
            games: discordTogether.join(", "),
        });
    }

    const invite = await member.client.discordTogether.createTogetherCode(vc, choice);
    return `${invite.code}`;
}
