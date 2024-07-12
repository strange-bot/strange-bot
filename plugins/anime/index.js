const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    dependencies: [],
    baseDir: __dirname,
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
});
