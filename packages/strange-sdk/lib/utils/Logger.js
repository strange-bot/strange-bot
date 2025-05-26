const pino = require("pino");
const Sentry = require("@sentry/node");

class Logger {
    /** @private */
    static #pinoLogger;

    /**
     * Initialize the logger with file destination and optional fields
     * @param {string} [dest] - File path for logs. If empty, only console logging is enabled
     * @param {object} [fields] - Additional fields to include in all log entries
     * @example
     * Logger.init('./logs/app.log', { shardId: '1', service: 'bot' })
     */
    static init(dest = "", fields = {}) {
        if (process.env.SENTRY_DSN) {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                environment: process.env.NODE_ENV,
                beforeSend(event) {
                    event.tags = { ...event.tags, ...fields };
                    return event;
                },
            });
        }

        const streamArray = [];
        streamArray.push({
            level: "info",
            stream: pino.transport({
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "yyyy-mm-dd HH:mm:ss",
                    ignore: fields
                        ? `pid,hostname,${Object.keys(fields).join(",")}`
                        : "pid,hostname",
                    singleLine: false,
                    hideObject: false,
                    customColors: "success:green,info:blue,warn:yellow,error:red",
                    customLevels: { success: 35, info: 30, warn: 40, error: 50 },
                },
            }),
        });

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

        const baseLogger = pino(
            {
                level: process.env.LOG_LEVEL || "info",
                customLevels: { success: 35 },
            },
            pino.multistream(streamArray),
        );

        Logger.#pinoLogger = Object.keys(fields).length > 0 ? baseLogger.child(fields) : baseLogger;
    }

    /**
     * Log a success message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     * @example
     * Logger.success('Operation completed', { userId: '123' })
     */
    static success(msg, args) {
        if (args) Logger.#pinoLogger.success(args, msg);
        else Logger.#pinoLogger.success(msg);
    }

    /**
     * Log an info message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     * @example
     * Logger.info('Processing request', { requestId: '456' })
     */
    static info(msg, args) {
        if (args) Logger.#pinoLogger.info(args, msg);
        else Logger.#pinoLogger.info(msg);
    }

    /**
     * Log a warning message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     * @example
     * Logger.warn('Rate limit approaching', { current: 80, limit: 100 })
     */
    static warn(msg, args) {
        if (args) Logger.#pinoLogger.warn(args, msg);
        else Logger.#pinoLogger.warn(msg);
    }

    /**
     * Log an error message with optional error object
     * @param {string} msg - The error message
     * @param {Error} [ex] - Optional Error object
     * @example
     * Logger.error('Failed to process', new Error('Invalid input'))
     */
    static error(msg, ex) {
        if (ex) {
            Logger.#pinoLogger.error(ex, `${msg}: ${ex?.message}`);

            if (process.env.SENTRY_DSN) {
                Sentry.captureException(ex, {
                    extra: { message: msg },
                });
            }
        } else {
            Logger.#pinoLogger.error(msg);
        }
    }

    /**
     * Log a debug message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     * @example
     * Logger.debug('Variable state', { count: 5, active: true })
     */
    static debug(msg, args) {
        if (args) Logger.#pinoLogger.debug(args, msg);
        else Logger.#pinoLogger.debug(msg);
    }
}

module.exports = Logger;
