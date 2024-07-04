const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-screwdriver-wrench",
    dependencies: [],
    baseDir: __dirname,
    events: [],

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
