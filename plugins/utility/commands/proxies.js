const { AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils } = require("strange-sdk/utils");

const PROXY_TYPES = ["all", "http", "socks4", "socks5"];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "proxies",
    description: "utility:PROXIES.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks", "AttachFiles"],
    command: {
        enabled: true,
        usage: "[type]",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "type",
                description: "utility:PROXIES.TYPE_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: PROXY_TYPES.map((p) => ({ name: p, value: p })),
            },
        ],
    },

    async messageRun(message, args) {
        let type = "all";

        if (args[0]) {
            if (PROXY_TYPES.includes(args[0].toLowerCase())) type = args[0].toLowerCase();
            else
                return message.safeReply(
                    "Incorrect proxy type. Available types: `http`, `socks4`, `socks5`",
                );
        }

        const msg = await message.channel.send("Fetching proxies... Please wait");
        const response = await getProxies(message, type);
        if (msg.deletable) await msg.delete();
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const type = interaction.options.getString("type");
        await interaction.followUpT("utility:PROXIES.FETCHING");
        const response = await getProxies(interaction, type);
        await interaction.editReply(response);
    },
};

async function getProxies({ guild }, type) {
    const response = await HttpUtils.getBuffer(
        `https://api.proxyscrape.com/?request=displayproxies&proxytype=${type}&timeout=10000&country=all&anonymity=all&ssl=all`,
    );

    if (!response.success || !response.buffer) return guild.getT("utility:PROXIES.ERROR");
    if (response.buffer.length === 0) return guild.getT("utility:PROXIES.EMPTY");

    const attachment = new AttachmentBuilder(response.buffer, {
        name: `${type.toLowerCase()}_proxies.txt`,
    });
    return { content: guild.getT("utility:PROXIES.SUCCESS"), files: [attachment] };
}
