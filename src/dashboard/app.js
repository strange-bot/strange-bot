/**
 * @param {import('discord.js').Client} client
 * @param {import('mongoose').Connection} connection
 */
module.exports = async (client, connection) => {
    const path = require("path");
    const express = require("express");
    const session = require("express-session");
    const expressLayouts = require("express-ejs-layouts");
    const MongoStore = require("connect-mongo");

    // Express App
    const app = express();

    // App Settings
    app.set("views", path.join(__dirname, "views"));
    app.set("layout", "./layouts/dashboard");
    app.set("view engine", "ejs");
    app.engine("html", require("ejs").renderFile);
    app.set("port", process.env.SERVER_PORT || 3000);

    // Middlewares
    const { CheckAuth, CheckAdmin } = require("./middlewares/auth.middleware");
    const Context = require("./middlewares/context.middleware");

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(expressLayouts);
    app.use(express.static(path.join(__dirname, "/public")));
    app.use(
        session({
            secret: process.env.DASHBOARD_SECRET,
            cookie: { maxAge: 336 * 60 * 60 * 1000 },
            name: "strange_cookie",
            resave: true,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGO_CONNECTION,
                client: connection.getClient(),
                dbName: connection.db.databaseName,
                collectionName: "sessions",
                stringify: false,
                autoRemove: "interval",
            }),
        }),
    );
    app.use(Context(client));

    // Routers
    const landingRouter = require("./routes/landing.router");
    const authRouter = require("./routes/auth.router");
    const adminRouter = require("./routes/admin.router");
    const dashboardRouter = require("./routes/dashboard.router");
    const apiRouter = require("./routes/api.router");

    app.use("/", landingRouter);
    app.use("/auth", authRouter);
    app.use("/admin", CheckAdmin, adminRouter);
    app.use("/dashboard", CheckAuth, dashboardRouter);
    app.use("/api", CheckAuth, apiRouter);

    // Error handling
    app.use((_req, res) => {
        res.status(404).send("404 | Page Not Found");
    });
    app.use((err, _req, res, _next) => {
        console.error(err.stack);
        res.status(500).send("Something went wrong!");
    });

    // Launch
    app.listen(app.get("port"), () => {
        client.logger.info(`Dashboard is running on port ${app.get("port")}`);
    });
};
