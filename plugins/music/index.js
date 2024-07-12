const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-music",
    dependencies: [],
    baseDir: __dirname,

    init: (client) => {
        client.musicManager = require("./lavaclient")(client);
    },

    dashboard: {
        enabled: true,
        adminRouter: require("./dashboard/router"),
    },
});
