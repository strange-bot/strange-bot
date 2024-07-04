const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-brands fa-youtube",
    dependencies: [],
    baseDir: __dirname,
    events: ["ready"],

    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        message: {
            type: String,
            default: "New video uploaded to channel {channel:name}: {video:title}\n{video:url}",
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
