const session = require("express-session");
const MongoStore = require("connect-mongo");
const { DBClient } = require("strange-db-client");

module.exports = () => {
    return session({
        secret: process.env.SESSION_SECRET,
        cookie: { maxAge: 336 * 60 * 60 * 1000 },
        name: process.env.SESSION_COOKIE,
        resave: true,
        saveUninitialized: false,
        store: MongoStore.create({
            client: DBClient.getInstance().getMongoClient(),
            dbName: DBClient.getInstance().getDatabaseName(),
            collectionName: "dashboard.sessions",
            stringify: false,
            autoRemove: "interval",
        }),
    });
};
