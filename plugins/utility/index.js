const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-screwdriver-wrench",
    dependencies: [],
    baseDir: __dirname,

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
