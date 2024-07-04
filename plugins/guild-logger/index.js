const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-file-lines",
    dependencies: [],
    baseDir: __dirname,
    ownerOnly: true,
    events: [],

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
