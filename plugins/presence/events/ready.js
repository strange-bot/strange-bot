const { ActivityType } = require("discord.js");
const config = require("../config");

module.exports = (client) => {
    function updatePresence(client) {
        let message = config.get("MESSAGE");

        if (message.includes("{servers}")) {
            message = message.replaceAll("{servers}", client.guilds.cache.size);
        }

        if (message.includes("{members}")) {
            const members = client.guilds.cache
                .map((g) => g.memberCount)
                .reduce((partial_sum, a) => partial_sum + a, 0);
            message = message.replaceAll("{members}", members);
        }

        const getType = (type) => {
            switch (type) {
                case "COMPETING":
                    return ActivityType.Competing;

                case "LISTENING":
                    return ActivityType.Listening;

                case "PLAYING":
                    return ActivityType.Playing;

                case "WATCHING":
                    return ActivityType.Watching;
            }
        };

        client.user.setPresence({
            status: config.get("STATUS"),
            activities: [
                {
                    name: message,
                    type: getType(config.get("TYPE")),
                },
            ],
        });
    }

    updatePresence(client);
    setInterval(() => updatePresence(client), 1000 * 60 * 10);
};
