const { WebhookClient } = require("discord.js");
const Logger = require("./Logger");
const HttpUtils = require("./HttpUtils");

/**
 * Utility class for bot-related operations
 */
class BotUtils {
    /**
     * Check if the bot is up to date by comparing versions with GitHub releases
     * @returns {Promise<boolean>} True if check was successful
     */
    static async checkForUpdates() {
        const response = await HttpUtils.getJson(
            process.env.UPDATE_CHECK_URL ||
                "https://api.github.com/repos/strange-bot/strange-bot/releases/latest",
        );
        if (!response.success) {
            Logger.error("VersionCheck: Failed to check for bot updates");
            return false;
        }
        if (response.data) {
            const currentVersion = require("../package.json").version;
            const latestVersion = response.data.tag_name;
            if (require("semver").gte(currentVersion, latestVersion)) {
                Logger.success("VersionCheck: Your discord bot is up to date");
            } else {
                Logger.warn(`VersionCheck: ${latestVersion} update is available`);
                Logger.warn("download: https://github.com/strange-bot/strange-bot/releases/latest");
            }
            return true;
        }
        return false;
    }

    /**
     * Sends a message through a webhook
     * @param {string} webhookUrl - The Discord webhook URL
     * @param {import('discord.js').WebhookMessageCreateOptions} payload - The message payload to send
     * @returns {Promise<import('discord.js').Message>} The sent message
     */
    static async sendWebhookMessage(webhookUrl, payload) {
        try {
            const webhook = new WebhookClient({ url: webhookUrl });
            return await webhook.send(payload);
        } catch (error) {
            Logger.error("Failed to send webhook message", error);
            throw error;
        }
    }
}

module.exports = BotUtils;
