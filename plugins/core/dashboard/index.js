const { DashboardPlugin } = require("strange-sdk");

const plugin = new DashboardPlugin({
    baseDir: __dirname,
    icon: "fa-solid fa-star",
    settingsRouter: require("./settings.router"),
    adminRouter: require("./admin.router"),
});

module.exports = plugin;
