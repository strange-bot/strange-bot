require("dotenv").config();
const { ShardingManager } = require("discord.js");
const { Logger } = require("strange-sdk/utils");
const path = require("node:path");

const today = new Date();
const logsFile = `shard-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`;
const logsDir = path.join(__dirname, "..", "..", "logs");
Logger.init(path.join(logsDir, logsFile));

const manager = new ShardingManager(path.join(__dirname, "bot.js"), {
    token: process.env.BOT_TOKEN,
    totalShards: process.env.SHARDS === "auto" ? "auto" : parseInt(process.env.SHARDS),
    respawn: false,
});

manager.on("shardCreate", (shard) => {
    Logger.info(`Launched shard ${shard.id}`);
});

manager.spawn().catch((err) => {
    Logger.error("shardSpawn Error", err);
});
