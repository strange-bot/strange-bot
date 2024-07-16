const { Plugin } = require("strange-sdk");
const events = require("./events");

module.exports = new Plugin({
    icon: "fa-solid fa-file-circle-exclamation",
    dependencies: [],
    baseDir: __dirname,

    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        log_channel: String,
        events: [
            {
                _id: false,
                name: {
                    type: String,
                    required: true,
                    enum: events,
                },
                enabled: {
                    type: Boolean,
                    required: true,
                    default: false,
                },
                log_channel: String,
            },
        ],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
