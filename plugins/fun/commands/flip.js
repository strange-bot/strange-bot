const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");

const NORMAL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_,;.?!/\\'0123456789";
const FLIPPED = "∀qϽᗡƎℲƃHIſʞ˥WNOԀὉᴚS⊥∩ΛMXʎZɐqɔpǝɟbɥıظʞןɯuodbɹsʇnʌʍxʎz‾'؛˙¿¡/\\,0ƖᄅƐㄣϛ9ㄥ86";

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "flip",
    description: "fun:FLIP.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "coin",
                description: "fun:FLIP.SUB_COIN_DESC",
            },
            {
                trigger: "text <input>",
                description: "fun:FLIP.SUB_MSG_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "coin",
                description: "fun:FLIP.SUB_COIN_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "text",
                description: "fun:FLIP.SUB_MSG_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "input",
                        description: "fun:FLIP.SUB_MSG_INPUT",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0].toLowerCase();
        const { guild } = message;

        if (sub === "coin") {
            const items = ["HEAD", "TAIL"];
            const toss = items[Math.floor(Math.random() * items.length)];

            message.channel.send({ embeds: [firstEmbed(guild, message.author)] }).then((coin) => {
                // 2nd embed
                setTimeout(() => {
                    coin.edit({ embeds: [secondEmbed(guild)] }).catch(() => {});
                    // 3rd embed
                    setTimeout(() => {
                        coin.edit({ embeds: [resultEmbed(guild, toss)] }).catch(() => {});
                    }, 2000);
                }, 2000);
            });
        }

        //
        else if (sub === "text") {
            if (args.length < 2) return message.replyT("fun:FLIP.MISSING_TEXT");
            const input = args.slice(1).join(" ");
            const response = await flipText(input);
            await message.safeReply(response);
        }

        // else
        else await message.replyT("common:INVALID_SUBCOMMAND", { sub });
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand("type");
        const { guild } = interaction;

        if (sub === "coin") {
            const items = ["HEAD", "TAIL"];
            const toss = items[Math.floor(Math.random() * items.length)];
            await interaction.followUp({ embeds: [firstEmbed(guild, interaction.user)] });

            setTimeout(() => {
                interaction.editReply({ embeds: [secondEmbed(guild)] }).catch(() => {});
                setTimeout(() => {
                    interaction.editReply({ embeds: [resultEmbed(guild, toss)] }).catch(() => {});
                }, 2000);
            }, 2000);
        }

        //
        else if (sub === "text") {
            const input = interaction.options.getString("input");
            const response = await flipText(input);
            await interaction.followUp(response);
        }
    },
};

const firstEmbed = (guild, user) =>
    EmbedUtils.transparent().setDescription(
        guild.getT("fun:FLIP.TOSS_START", { user: user.username }),
    );

const secondEmbed = (guild) => new EmbedBuilder().setDescription(guild.getT("fun:FLIP.TOSS_AIR"));

const resultEmbed = (guild, toss) =>
    new EmbedBuilder()
        .setDescription(`>> **${toss} Wins** <<`)
        .setImage(
            toss === "HEAD" ? "https://i.imgur.com/HavOS7J.png" : "https://i.imgur.com/u1pmQMV.png",
        );

async function flipText(text) {
    let builder = "";
    for (let i = 0; i < text.length; i += 1) {
        const letter = text.charAt(i);
        const a = NORMAL.indexOf(letter);
        builder += a !== -1 ? FLIPPED.charAt(a) : letter;
    }
    return builder;
}
