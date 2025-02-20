const BotPlugin = require("./lib/BotPlugin");
const Config = require("./lib/Config");
const DashboardPlugin = require("./lib/DashboardPlugin");
const DBService = require("./lib/DBService");
const { Schema, SchemaTypes } = require("strange-db-client");

module.exports = {
    BotPlugin,
    Config,
    DashboardPlugin,
    DBService,
    Schema,
    SchemaTypes,
};
