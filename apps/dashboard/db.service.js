const { DBService, Schema } = require("strange-sdk");

class DashboardService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas() {
        return {
            users: new Schema(
                {
                    _id: String,
                    locale: String,
                    logged_in: Boolean,
                    tokens: {
                        access_token: String,
                        refresh_token: String,
                        expires: Number,
                    },
                },
                {
                    timestamps: {
                        createdAt: "created_at",
                        updatedAt: "updated_at",
                    },
                },
            ),
        };
    }

    async getState(state) {
        return this.getCache(`dashboard:states:${state}`);
    }

    async saveState(state, redirectURL) {
        return this.cache(`dashboard:states:${state}`, redirectURL, 60);
    }

    async getLocale(userId) {
        const user = await this.getModel("users").findOne({ _id: userId }, "locale").lean();
        return user?.locale;
    }

    async setLocale(userId, lang) {
        return this.getModel("users").updateOne(
            { _id: userId },
            { $set: { locale: lang } },
            { upsert: true },
        );
    }

    async loginUser(userId, tokens) {
        return this.getModel("users").updateOne(
            { _id: userId },
            { $set: { tokens, logged_in: true } },
            { upsert: true },
        );
    }

    async logoutUser(userId) {
        return this.getModel("users").updateOne({ _id: userId }, { $set: { logged_in: false } });
    }
}

module.exports = new DashboardService();
