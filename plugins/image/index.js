const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-image",
    dependencies: [],
    baseDir: __dirname,
    events: [],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
