const { ApplicationCommandOptionType } = require("discord.js");
const balance = require("./sub/balance");
const deposit = require("./sub/deposit");
const transfer = require("./sub/transfer");
const withdraw = require("./sub/withdraw");

/**
 * @type {import('typings').CommandType}
 */
module.exports = {
    name: "bank",
    description: "economy:BANK.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "balance",
                description: "economy:BANK.BALANCE_DESC",
            },
            {
                trigger: "deposit <coins>",
                description: "economy:BANK.DEPOSIT_DESC",
            },
            {
                trigger: "withdraw <coins>",
                description: "economy:BANK.WITHDRAW_DESC",
            },
            {
                trigger: "transfer <user> <coins>",
                description: "economy:BANK.TRANSFER_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "balance",
                description: "economy:BANK.BALANCE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "economy:BANK.BALANCE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "deposit",
                description: "economy:BANK.DEPOSIT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "coins",
                        description: "economy:BANK.DEPOSIT_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "withdraw",
                description: "economy:BANK.WITHDRAW_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "coins",
                        description: "economy:BANK.WITHDRAW_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "transfer",
                description: "economy:BANK.TRANSFER_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "economy:BANK.TRANSFER_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "coins",
                        description: "economy:BANK.TRANSFER_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0];
        let response;

        if (sub === "balance") {
            const resolved = (await message.guild.resolveMember(args[1])) || message.member;
            response = await balance(message.guild, resolved.user);
        }

        //
        else if (sub === "deposit") {
            const coins = args.length && parseInt(args[1]);
            response = await deposit(message.guild, message.author, coins);
        }

        //
        else if (sub === "withdraw") {
            const coins = args.length && parseInt(args[1]);
            if (isNaN(coins)) return message.replyT("economy:BANK.INVALID_WITHDRAW");
            response = await withdraw(message.guild, message.author, coins);
        }

        //
        else if (sub === "transfer") {
            if (args.length < 3) return message.replyT("economy:BANK.INVALID_TRANSFER");
            const target = await message.guild.resolveMember(args[1], true);
            if (!target) return message.replyT("economy:BANK.INVALID_TRANSFER_USER");
            const coins = parseInt(args[2]);
            if (isNaN(coins)) return message.replyT("economy:BANK.INVALID_TRANSFER_AMOUNT");
            response = await transfer(message.guild, message.author, target.user, coins);
        }

        //
        else {
            return message.replyT("common:INVALID_SUBCOMMAND", { sub });
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        let response;

        // balance
        if (sub === "balance") {
            const user = interaction.options.getUser("user") || interaction.user;
            response = await balance(interaction.guild, user);
        }

        // deposit
        else if (sub === "deposit") {
            const coins = interaction.options.getInteger("coins");
            response = await deposit(interaction.guild, interaction.user, coins);
        }

        // withdraw
        else if (sub === "withdraw") {
            const coins = interaction.options.getInteger("coins");
            response = await withdraw(interaction.guild, interaction.user, coins);
        }

        // transfer
        else if (sub === "transfer") {
            const user = interaction.options.getUser("user");
            const coins = interaction.options.getInteger("coins");
            response = await transfer(interaction.guild, interaction.user, user, coins);
        }

        await interaction.followUp(response);
    },
};
