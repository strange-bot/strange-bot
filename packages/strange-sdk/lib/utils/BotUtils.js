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
            "https://api.github.com/repos/saiteja-madha/discord-js-bot/releases/latest",
        );
        if (!response.success) return Logger.error("VersionCheck: Failed to check for bot updates");
        if (response.data) {
            if (
                require("../package.json").version.replace(/[^0-9]/g, "") >=
                response.data.tag_name.replace(/[^0-9]/g, "")
            ) {
                Logger.success("VersionCheck: Your discord bot is up to date");
            } else {
                Logger.warn(`VersionCheck: ${response.data.tag_name} update is available`);
                Logger.warn(
                    "download: https://github.com/saiteja-madha/discord-js-bot/releases/latest",
                );
            }
        }
    }

    /**
     * Sends a message through a webhook
     * @param {string} webhookUrl - The Discord webhook URL
     * @param {import('discord.js').WebhookMessageCreateOptions} payload - The message payload to send
     * @returns {Promise<import('discord.js').Message>} The sent message
     */
    static async sendWebhookMessage(webhookUrl, payload) {
        const webhook = new WebhookClient({ url: webhookUrl });
        return webhook.send(payload);
    }
}

module.exports = BotUtils;
