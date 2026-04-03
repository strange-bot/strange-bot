const { readdirSync, lstatSync } = require("node:fs");
const { join, extname } = require("node:path");
const permissions = require("../utils/permissions");

/**
 * Collection of miscellaneous utility functions
 */
class MiscUtils {
    /**
     * Checks if a string contains a URL
     * @param {string} text - Text to check for URLs
     * @returns {boolean} True if text contains a URL
     */
    static containsLink(text) {
        return /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/.test(
            text,
        );
    }

    /**
     * Checks if a string contains a Discord invite link
     * @param {string} text - Text to check for Discord invites
     * @returns {boolean} True if text contains a Discord invite
     */
    static containsDiscordInvite(text) {
        return /(https?:\/\/)?(www.)?(discord.(gg|io|me|li|link|plus)|discorda?p?p?.com\/invite|invite.gg|dsc.gg|urlcord.cf)\/[^\s/]+?(?=\b)/.test(
            text,
        );
    }

    /**
     * Generates a random integer between 0 and max
     * @param {number} max - Upper bound (exclusive)
     * @returns {number} Random integer
     */
    static getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    /**
     * Checks if a string is a valid hexadecimal color code
     * @param {string} text - Text to validate
     * @returns {boolean} True if text is a valid hex color
     */
    static isHex(text) {
        return /^#[0-9A-F]{6}$/i.test(text);
    }

    /**
     * Checks if a string is a valid Discord color name
     * @param {string} text - Color name to validate
     * @returns {boolean} True if text is a valid Discord color name
     */
    static isValidColor(text) {
        if (
            [
                "Default",
                "Random",
                "Aqua",
                "DarkAqua",
                "Green",
                "DarkGreen",
                "Blue",
                "DarkBlue",
                "Purple",
                "DarkPurple",
                "LuminousVividPink",
                "DarkVividPink",
                "Gold",
                "DarkGold",
                "Orange",
                "DarkOrange",
                "Red",
                "DarkRed",
                "Grey",
                "DarkGrey",
                "DarkerGrey",
                "LightGrey",
                "Navy",
                "DarkNavy",
                "Yellow",
                "White",
                "Greyple",
                "Black",
                "DarkButNotBlack",
                "NotQuiteBlack",
                "Blurple",
                "Fuchsia",
            ].indexOf(text) > -1
        ) {
            return true;
        } else return false;
    }

    /**
     * Calculates the absolute hour difference between two dates
     * @param {Date} dt2 - Second date
     * @param {Date} dt1 - First date
     * @returns {number} Hour difference
     */
    static diffHours(dt2, dt1) {
        let diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60 * 60;
        return Math.abs(Math.round(diff));
    }

    /**
     * Formats time in seconds to a human-readable string
     * @param {number} timeInSeconds - Time in seconds
     * @returns {string} Formatted time string
     */
    static timeformat(timeInSeconds) {
        const days = Math.floor((timeInSeconds % 31536000) / 86400);
        const hours = Math.floor((timeInSeconds % 86400) / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.round(timeInSeconds % 60);
        return (
            (days > 0 ? `${days} days, ` : "") +
            (hours > 0 ? `${hours} hours, ` : "") +
            (minutes > 0 ? `${minutes} minutes, ` : "") +
            (seconds > 0 ? `${seconds} seconds` : "")
        );
    }

    /**
     * Converts duration string (HH:MM:SS) to milliseconds
     * @param {string} duration - Duration in HH:MM:SS format
     * @returns {number} Duration in milliseconds
     */
    static durationToMillis(duration) {
        return (
            duration
                .split(":")
                .map(Number)
                .reduce((acc, curr) => curr + acc * 60) * 1000
        );
    }

    /**
     * Calculates and formats time remaining until a future date
     * @param {Date} timeUntil - Target future date
     * @returns {string} Formatted remaining time
     */
    static getRemainingTime(timeUntil) {
        const seconds = Math.abs((timeUntil - new Date()) / 1000);
        const time = MiscUtils.timeformat(seconds);
        return time;
    }

    /**
     * Converts Discord permission flags to readable strings
     * @param {import("discord.js").PermissionResolvable[]} perms - Array of permission flags
     * @returns {string} Formatted permission string
     */
    static parsePermissions(perms) {
        const permissionWord = `permission${perms.length > 1 ? "s" : ""}`;
        return "`" + perms.map((perm) => permissions[perm]).join(", ") + "` " + permissionWord;
    }

    /**
     * Recursively finds all files with specified extensions in a directory
     * @param {string} dir - Directory to search in
     * @param {string[]} [allowedExtensions=[".js"]] - Array of allowed file extensions
     * @returns {string[]} Array of file paths
     */
    static recursiveReadDirSync(dir, allowedExtensions = [".js"]) {
        const filePaths = [];
        const readCommands = (dir) => {
            const files = readdirSync(dir);
            files.forEach((file) => {
                const stat = lstatSync(join(dir, file));
                if (stat.isDirectory()) {
                    readCommands(join(dir, file));
                } else {
                    const extension = extname(file);
                    if (!allowedExtensions.includes(extension)) return;
                    if (file.startsWith(".")) return;
                    const filePath = join(dir, file);
                    filePaths.push(filePath);
                }
            });
        };
        readCommands(dir);
        return filePaths;
    }

    static mergeObjects(leftObj, rightObj) {
        let shouldSync = false;

        /**
         * Check if item is an object
         * @param {*} item - Item to check
         * @returns {boolean} True if item is an object
         */
        function isObject(item) {
            return item && typeof item === "object" && !Array.isArray(item);
        }

        /**
         * Deep merge two objects
         * @param {object} _leftObj - Left object
         * @param {object} _rightObj - Right object
         * @returns {{merged: {}, shouldSync: boolean}} Merged object and sync flag
         */
        function deepMerge(_leftObj, _rightObj) {
            const merged = { ..._rightObj };

            // Check left keys
            for (const key in _leftObj) {
                const leftValue = _leftObj[key];
                const rightValue = _rightObj[key];

                // New key in left that doesn't exist in right
                if (!(key in _rightObj)) {
                    shouldSync = true;
                    merged[key] = leftValue;
                    continue;
                }

                // Handle arrays
                if (Array.isArray(leftValue)) {
                    if (!Array.isArray(rightValue)) {
                        // Type mismatch: left is array, right is not
                        delete merged[key];
                        shouldSync = true;
                        continue;
                    }

                    // If array contains objects, merge them by index
                    if (leftValue.some((item) => isObject(item))) {
                        merged[key] = leftValue.map((item, index) => {
                            if (
                                isObject(item) &&
                                index < rightValue.length &&
                                isObject(rightValue[index])
                            ) {
                                return deepMerge(item, rightValue[index]);
                            }
                            return index < rightValue.length ? rightValue[index] : item;
                        });

                        // If left array has more items than right array
                        if (leftValue.length > rightValue.length) {
                            shouldSync = true;
                        }
                    } else {
                        // For primitive arrays, keep right value
                        merged[key] = rightValue;
                    }
                    continue;
                }

                // Check if types are different
                if (typeof leftValue !== typeof rightValue) {
                    delete merged[key];
                    shouldSync = true;
                    continue;
                }

                // Handle nested objects
                if (isObject(leftValue) && isObject(rightValue)) {
                    merged[key] = deepMerge(leftValue, rightValue);
                }
            }

            return merged;
        }

        const mergedConfig = deepMerge(leftObj, rightObj);

        return {
            merged: mergedConfig,
            shouldSync,
        };
    }
}

module.exports = MiscUtils;
