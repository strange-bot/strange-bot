const { BotPlugin } = require("strange-sdk");

const plugin = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    registerSchemas: (config) => ({
        settings: {
            enabled: {
                type: Boolean,
                default: true,
            },
            prefix: {
                type: String,
                default: config["PREFIX_COMMANDS"]["DEFAULT_PREFIX"],
            },
            locale: {
                type: String,
                default: config["LOCALE"]["DEFAULT"],
            },
            disabled_prefix: [String],
            disabled_slash: [String],
        },
    }),

    ipcHandler: require("./ipc.handler"),
});

module.exports = plugin;
