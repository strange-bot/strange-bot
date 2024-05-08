require("dotenv").config();

const envVars = [
    "BOT_TOKEN",
    "MONGO_CONNECTION",
    "SERVER_PORT",
    "CLIENT_SECRET",
    "DASHBOARD_SECRET",
];

// Missing environment variables
const missingVariables = envVars.filter((env) => !process.env[env]);
if (missingVariables.length) {
    console.log(`Missing required environment variables: ${missingVariables.join(", ")}`);
    process.exit(1);
}

// Null environment variables
const nullVariables = envVars.filter((env) => process.env[env] === "NULL");
if (nullVariables.length) {
    console.log(`Environment variables cannot be null: ${nullVariables.join(", ")}`);
    process.exit(1);
}
