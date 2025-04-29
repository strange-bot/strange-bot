# Strange Bot

A premium Discord bot with a plugin-based architecture that allows for easy extensibility and customization.

## Features

- **Plugin System:** Easily extend the bot's functionality through plugins
- **Dashboard:** Web interface for managing bot settings and plugins
- **Multi-Guild Support:** Configure the bot differently for each Discord server
- **Database Integration:** MongoDB and Redis support for data persistence
- **Internationalization:** Support for multiple languages
- **Sharding Support:** Scale the bot across multiple processes for large Discord servers

## Project Structure

```
├── apps/                  # Applications
│   ├── bot/               # Discord bot application
│   └── dashboard/         # Web dashboard
├── packages/              # Core libraries
│   ├── strange-core/      # Core functionality
│   ├── strange-db-client/ # Database client
│   └── strange-sdk/       # Plugin SDK
└── plugins/               # Bot plugins
```

## Installation (Without Docker)

### Prerequisites

- Node.js 18 or higher
- MongoDB
- Redis (for caching)
- pnpm package manager

### Setup

1. Clone the repository

```bash
git clone https://github.com/strange-bot/strange-bot.git
cd strange-bot
```

2. Install dependencies

```bash
pnpm install
```

3. Set up environment variables

```bash
cp apps/bot/.env.example apps/bot/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

4. Start the bot

```bash
# Start both bot and dashboard
pnpm start

# Start only the bot
pnpm start:bot

# Start only the dashboard
pnpm start:dashboard
```

## Installation (With Docker)

### Prerequisites

- Docker and Docker Compose

### Setup

1. Clone the repository

```bash
git clone https://github.com/strange-bot/strange-bot.git
cd strange-bot
```

2. Copy the example environment file

```bash
cp .env.docker.example .env.docker
```

3. Edit the `.env.docker` file to set your environment variables.

4. Build and run the Docker containers

```bash
docker compose --env-file .env.docker up -d
```

5. Stop the containers when you're done

```bash
docker compose --env-file .env.docker down
```


## Environment Variables

Before running the bot and dashboard, you need to configure the environment variables. Here's a breakdown of the required variables:

### Mongo Variables (Docker Only)

- `MONGO_INITDB_ROOT_USERNAME`: MongoDB root username.
- `MONGO_INITDB_ROOT_PASSWORD`: MongoDB root password.

### Shared Variables

- `IPC_SERVER_PORT`: Port for inter-process communication between the bot and dashboard.
- `REDIS_URL`: URL for the Redis server.
- `MONGO_URI`: Connection string for the MongoDB database.
- `OWNER_IDS`: Comma-separated list of Discord user IDs who are bot owners.
- `SENTRY_DSN`: DSN for Sentry error tracking (optional).
- `REGISTRY_PATH`: Path to the plugins registry file.
- `PLUGINS_DIR`: Path to the directory containing the bot plugins.

### Bot Variables

- `BOT_TOKEN`: The Discord bot token.
- `SHARDS`: Number of shards to use. Can be set to `auto` for automatic sharding.

### Dashboard Variables

- `DASHBOARD_BASE_URL`: Base URL for the dashboard.
- `DASHBOARD_PORT`: Port for the dashboard to listen on.
- `CLIENT_ID`: Discord application client ID.
- `CLIENT_SECRET`: Discord application client secret.
- `SESSION_COOKIE`: Name of the session cookie (Long random string).
- `SESSION_SECRET`: Secret key for session management (Long random string).
- `TOKEN_ENCRYPTION_KEY`: Encryption key for encrypting tokens (Long random string).

## Development

```bash
# Run in development mode
pnpm dev

# Bot only
pnpm dev:bot

# Dashboard only
pnpm dev:dashboard
```

## Plugin System

Strange Bot uses a modular plugin system that allows for easy extension of functionality. Plugins are automatically loaded from the plugins directory.

### Creating a Plugin

Coming soon...

## License

This project is licensed under the GNU Affero General Public License v3.0.

## Contributing

Contributions are welcome! Please feel free to report bugs or submit feature requests.

---

**Note:** This is a pre-release version. Please report any bugs or issues you encounter.
