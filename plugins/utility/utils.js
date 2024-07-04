const sourcebin = require("sourcebin_js");
const { Logger } = require("strange-sdk/utils");

/**
 * Posts the provided content to the BIN
 * @param {string} content
 * @param {string} title
 */
async function postToBin(content, title) {
    try {
        const response = await sourcebin.create(
            [
                {
                    name: " ",
                    content,
                    languageId: "text",
                },
            ],
            {
                title,
                description: " ",
            },
        );
        return {
            url: response.url,
            short: response.short,
            raw: `https://cdn.sourceb.in/bins/${response.key}/0`,
        };
    } catch (ex) {
        Logger.error(`postToBin`, ex);
    }
}

module.exports = {
    postToBin,
};
