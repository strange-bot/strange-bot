const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-ticket",
    dependencies: [],
    baseDir: __dirname,
    events: ["interactionCreate"],

    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        embed_colors: {
            create: {
                type: String,
                default: "#068ADD",
            },
            close: {
                type: String,
                default: "#068ADD",
            },
        },
        log_channel: String,
        limit: { type: Number, default: 10 },
        categories: [
            {
                _id: false,
                name: String,
                description: String,
                parent_id: {
                    type: String,
                    default: "auto",
                },
                channel_style: {
                    type: String,
                    required: true,
                    enum: ["NUMBER", "NAME", "ID"],
                    default: "NUMBER",
                },
                staff_roles: [String],
                member_roles: [String],
                open_msg: {
                    title: String,
                    description: String,
                    footer: String,
                },
            },
        ],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
