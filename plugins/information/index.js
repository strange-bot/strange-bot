const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-info",
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
