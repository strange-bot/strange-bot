const fetch = require("node-fetch");
const { error, debug } = require("./Logger");

/**
 * Utility class for making HTTP requests
 */
class HttpUtils {
    /**
     * Fetches and returns JSON data from a URL
     * @param {string} url - The URL to fetch from
     * @param {import('node-fetch').RequestInit} [options] - Fetch options
     * @returns {Promise<{success: boolean, status?: number, data?: any}>} Response object
     */
    static async getJson(url, options) {
        try {
            // with auth
            const response = options ? await fetch(url, options) : await fetch(url);
            const json = await response.json();
            return {
                success: response.status === 200 ? true : false,
                status: response.status,
                data: json,
            };
        } catch (ex) {
            debug(`Url: ${url}`);
            error(`getJson`, ex);
            return {
                success: false,
            };
        }
    }

    /**
     * Fetches and returns buffer data from a URL
     * @param {string} url - The URL to fetch from
     * @param {import('node-fetch').RequestInit} [options] - Fetch options
     * @returns {Promise<{success: boolean, status?: number, buffer?: Buffer}>} Response object
     */
    static async getBuffer(url, options) {
        try {
            const response = options ? await fetch(url, options) : await fetch(url);
            const buffer = await response.buffer();
            if (response.status !== 200) debug(response);
            return {
                success: response.status === 200 ? true : false,
                status: response.status,
                buffer,
            };
        } catch (ex) {
            debug(`Url: ${url}`);
            error(`getBuffer`, ex);
            return {
                success: false,
            };
        }
    }
}

module.exports = HttpUtils;
