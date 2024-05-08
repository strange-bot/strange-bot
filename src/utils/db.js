const mongoose = require("mongoose");
const { Logger } = require("strange-sdk/utils");

module.exports.init = async () => {
    Logger.info(`Mongoose: Establishing database connection...`);
    try {
        const mongo = await mongoose.connect(process.env.MONGO_CONNECTION);
        Logger.success("Mongoose: Database connection established");
        return mongo.connection;
    } catch (error) {
        Logger.error("An error occurred while connecting to the database.", error);
        process.exit(1);
    }
};
