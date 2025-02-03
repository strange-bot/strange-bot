require("dotenv").config();
const { ShardingManager } = require("discord.js");
const path = require("node:path");

const manager = new ShardingManager(path.join(__dirname, "bot.js"), {
    token: process.env.BOT_TOKEN,
    totalShards: process.env.SHARDS === "auto" ? "auto" : parseInt(process.env.SHARDS),
    respawn: false,
});

manager.on("shardCreate", (shard) => {
    console.log(`Launched shard ${shard.id}`);
});

manager.spawn().catch(console.error);
