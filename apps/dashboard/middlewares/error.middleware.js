const { Logger } = require("strange-sdk/utils");

/**
 * Middleware for handling server errors
 * @param {Error} error
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
module.exports = (error, _req, res, _next) => {
    const status = error.status || 500;
    Logger.error("errorMiddleware", error);
    res.status(status).send({
        success: false,
        code: status,
        message:
            "500 Internal Error, Something was error on our side and this should not happen! Please try again later.",
    });
};
