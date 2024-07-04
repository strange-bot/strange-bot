const ISO6391 = require("iso-639-1");
const { Logger } = require("strange-sdk/utils");
const { translate: gTranslate } = require("@vitalets/google-translate-api");

async function translate(content, outputCode) {
    try {
        const { text, raw } = await gTranslate(content, { to: outputCode });
        return {
            input: raw.src,
            output: text,
            inputCode: raw.src,
            outputCode,
            inputLang: ISO6391.getName(raw.src),
            outputLang: ISO6391.getName(outputCode),
        };
    } catch (ex) {
        Logger.error("translate", ex);
        Logger.debug(`Content - ${content} OutputCode: ${outputCode}`);
    }
}

module.exports = {
    translate,
};
