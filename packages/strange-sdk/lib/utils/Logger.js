const { EmbedBuilder, WebhookClient } = require("discord.js");
const pino = require("pino");

class Logger {
    static #pinoLogger = pino({
        level: "debug",
        transport: {
            target: "pino-pretty",
        },
    });
    static #webhookLogger;

    /**
     * Initialize the pinoLogger and webhookLogger during bot startup
     * @param {string} [dest] - The destination to store the logs
     */
    static init(dest = "") {
        const streamArray = [
            {
                level: "info",
                stream: pino.transport({
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                        translateTime: "yyyy-mm-dd HH:mm:ss",
                        ignore: "pid,hostname",
                        singleLine: false,
                        hideObject: false,
                        customColors: "info:blue,warn:yellow,error:red",
                    },
                }),
            },
        ];

        if (dest) {
            streamArray.push({
                level: "debug",
                stream: pino.destination({
                    dest,
                    sync: true,
                    mkdir: true,
                }),
            });
        }

        // Initialize the pinoLogger with the streamArray
        Logger.#pinoLogger = pino.default({ level: "info" }, pino.multistream(streamArray));

        // Check for environment variable ERROR_LOGS and initialize webhookLogger accordingly
        Logger.#webhookLogger = process.env.ERROR_LOGS
            ? new WebhookClient({ url: process.env.ERROR_LOGS })
            : undefined;
    }

    static #sendWebhook(content, err) {
        if (!content && !err) return;
        const errString = err?.stack || err;

        const embed = new EmbedBuilder()
            .setColor("#D61A3C")
            .setAuthor({ name: err?.name || "Error" });

        if (errString)
            embed.setDescription(
                "```js\n" +
                    (errString.length > 4096 ? `${errString.substr(0, 4000)}...` : errString) +
                    "\n```",
            );

        embed.addFields({ name: "Description", value: content || err?.message || "NA" });
        Logger.#webhookLogger.send({ username: "Logs", embeds: [embed] }).catch((ex) => {});
    }

    /**
     * @param {string} msg
     * @param  {...any} args
     */
    static success(msg, ...args) {
        Logger.#pinoLogger.info(args, msg);
    }

    /**
     * @param {string} msg
     * @param  {...any} args
     */
    static info(msg, ...args) {
        Logger.#pinoLogger.info(args, msg);
    }

    /**
     * @param {string} msg
     * @param  {...any} args
     */
    static warn(msg, ...args) {
        Logger.#pinoLogger.warn(args, msg);
    }

    /**
     * @param {string} msg
     * @param {object} ex
     */
    static error(msg, ex) {
        if (ex) Logger.#pinoLogger.error(ex, `${msg}: ${ex?.message}`);
        else Logger.#pinoLogger.error(msg);
        if (Logger.#webhookLogger) Logger.#sendWebhook(msg, ex);
    }

    /**
     * @param {string} msg
     * @param  {...any} args
     */
    static debug(msg, ...args) {
        Logger.#pinoLogger.debug(args, msg);
    }
}

module.exports = Logger;
