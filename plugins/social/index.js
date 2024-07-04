const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-people-arrows",
    dependencies: [],
    baseDir: __dirname,
    events: [],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
});
