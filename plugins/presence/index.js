const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    dependencies: [],
    ownerOnly: true,
    baseDir: __dirname,

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
