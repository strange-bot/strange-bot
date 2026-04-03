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

        // Build ignore list cleanly (no trailing comma)
        const ignoredKeys = ["pid", "hostname", ...Object.keys(fields || {})];
        const ignore = ignoredKeys.join(",");

        // Dev: pretty logs via pino-pretty worker
        // Prod: plain JSON to stdout (no worker dependency)
        if (process.env.NODE_ENV !== "production") {
            const prettyTransport = pino.transport({
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "yyyy-mm-dd HH:mm:ss",
                    ignore,
                    singleLine: false,
                    hideObject: false,
                    customColors: "success:green,info:blue,warn:yellow,error:red",
                    customLevels: { success: 35, info: 30, warn: 40, error: 50 },
                },
            });

            // Surface worker errors without going through Logger/Pino again
            prettyTransport.on("error", (err) => {
                console.error("[pino-pretty worker error]", err);
            });

            streamArray.push({
                level: "info",
                stream: prettyTransport,
            });
        } else {
            // Production: simple stdout stream, no pretty worker thread
            streamArray.push({
                level: "info",
                stream: process.stdout,
            });
        }

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

    /** Centralized helper to send exceptions to Sentry safely */
    static captureException(err, context) {
        if (!process.env.SENTRY_DSN || !err) return;

        try {
            Sentry.captureException(err, context);
        } catch (e) {
            // Never let Sentry itself crash anything
            console.error("[Logger Sentry captureException failed]", e);
        }
    }

    /** @private */
    static #safeLog(level, msg, args) {
        // If init() was never called
        if (!Logger.#pinoLogger) {
            console.error(`[Logger not initialized][${level}]`, msg, args ?? "");
            return;
        }

        try {
            if (args !== undefined && args !== null) {
                // Pino pattern: logger[level](objectOrError, message)
                Logger.#pinoLogger[level](args, msg);
            } else {
                Logger.#pinoLogger[level](msg);
            }
        } catch (err) {
            // Last line of defense: logging should never crash the process
            console.error(`[Logger failed][${level}]`, err, msg, args ?? "");
        }
    }

    /**
     * Log a success message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     */
    static success(msg, args) {
        this.#safeLog("success", msg, args);
    }

    /**
     * Log an info message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     */
    static info(msg, args) {
        this.#safeLog("info", msg, args);
    }

    /**
     * Log a warning message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     */
    static warn(msg, args) {
        this.#safeLog("warn", msg, args);
    }

    /**
     * Log a debug message with optional arguments
     * @param {string} msg - The message to log
     * @param {object} args - Additional arguments to include
     */
    static debug(msg, args) {
        this.#safeLog("debug", msg, args);
    }

    /**
     * Log an error message with optional error object
     * @param {string} msg - The error message
     * @param {Error} [ex] - Optional Error object
     */
    static error(msg, ex) {
        if (ex) {
            // Message includes error message, error object is logged as context
            this.#safeLog("error", `${msg}: ${ex?.message}`, ex);

            Logger.captureException(ex, {
                extra: { message: msg },
            });
        } else {
            this.#safeLog("error", msg);
        }
    }
}

module.exports = Logger;
