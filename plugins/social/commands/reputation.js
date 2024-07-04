const { ApplicationCommandOptionType } = require("discord.js");
const { MiscUtils, EmbedUtils } = require("strange-sdk/utils");
const { getSocial } = require("../schemas/Social");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "rep",
    description: "social:REP.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        aliases: ["reputation"],
        subcommands: [
            {
                trigger: "view [user]",
                description: "social:REP.SUB_VIEW_DESC",
            },
            {
                trigger: "give [user]",
                description: "social:REP.SUB_GIVE_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "view",
                description: "social:REP.SUB_VIEW_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "social:REP.SUB_VIEW_USER_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "give",
                description: "social:REP.SUB_GIVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "social:REP.SUB_GIVE_USER_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0];
        let response;

        // status
        if (sub === "view") {
            let target = message.author;
            if (args.length > 1) {
                const resolved = (await message.guild.resolveMember(args[1])) || message.member;
                if (resolved) target = resolved.user;
            }
            response = await viewReputation(message, target);
        }

        // give
        else if (sub === "give") {
            const target = await message.guild.resolveMember(args[1]);
            if (!target) return message.replyT("social:REP.INVALID_USER");
            response = await giveReputation(message, message.author, target.user);
        }

        //
        else {
            response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        let response;

        // status
        if (sub === "view") {
            const target = interaction.options.getUser("user") || interaction.user;
            response = await viewReputation(interaction, target);
        }

        // give
        if (sub === "give") {
            const target = interaction.options.getUser("user");
            response = await giveReputation(interaction, interaction.user, target);
        }

        await interaction.followUp(response);
    },
};

async function viewReputation({ guild }, target) {
    const userData = await getSocial(target);
    if (!userData) return guild.getT("social:REP.NO_REP", { user: target.username });

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("social:REP.VIEW_REP_TITLE", { target: target.username }),
        })
        .setThumbnail(target.displayAvatarURL())
        .addFields(
            {
                name: guild.getT("social:REP.GIVEN"),
                value: userData.reputation?.given.toString(),
                inline: true,
            },
            {
                name: guild.getT("social:REP.RECEIVED"),
                value: userData.reputation?.received.toString(),
                inline: true,
            },
        );

    return { embeds: [embed] };
}

async function giveReputation({ guild }, user, target) {
    if (target.bot) return guild.getT("social:REP.BOT_REP");
    if (target.id === user.id) return guild.getT("social:REP.SELF_REP");

    const userData = await getSocial(user);
    if (userData && userData.reputation.timestamp) {
        const lastRep = new Date(userData.reputation.timestamp);
        const diff = MiscUtils.diffHours(new Date(), lastRep);
        if (diff < 24) {
            const nextUsage = lastRep.setHours(lastRep.getHours() + 24);
            return guild.getT("social:REP.REP_COOLDOWN", {
                time: MiscUtils.getRemainingTime(nextUsage),
            });
        }
    }

    const targetData = await getSocial(target);

    userData.reputation.given += 1;
    userData.reputation.timestamp = new Date();
    targetData.reputation.received += 1;

    await userData.save();
    await targetData.save();

    const embed = EmbedUtils.embed()
        .setDescription(`${target.toString()} +1 Rep!`)
        .setFooter({ text: `By ${user.username}` })
        .setTimestamp(Date.now());

    return { embeds: [embed] };
}
