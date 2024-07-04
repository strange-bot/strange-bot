const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    dependencies: [],
    ownerOnly: true,
    baseDir: __dirname,
    events: ["ready"],

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
