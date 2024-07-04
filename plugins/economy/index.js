const { Plugin } = require("strange-sdk");
const config = require("./config");

module.exports = new Plugin({
    icon: "fa-solid fa-coins",
    dependencies: [],
    baseDir: __dirname,
    events: [],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        currency: {
            type: String,
            default: config.get("CURRENCY"),
        },
        daily_coins: {
            type: Number,
            default: config.get("DAILY_COINS"),
        },
        min_beg_amount: {
            type: Number,
            default: config.get("MIN_BEG_AMOUNT"),
        },
        max_beg_amount: {
            type: Number,
            default: config.get("MAX_BEG_AMOUNT"),
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/settings.router"),
        adminRouter: require("./dashboard/admin.router"),
    },
});
