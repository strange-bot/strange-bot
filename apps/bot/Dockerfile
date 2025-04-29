FROM node:18-alpine

WORKDIR /app

# Install git and other dependencies
RUN apk add --no-cache git

# Install pnpm globally
RUN npm install -g pnpm

# Copy workspace configuration and package.json files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy the bot app and any shared packages it depends on
COPY apps/bot/ ./apps/bot/
COPY packages/ ./packages/
COPY plugins/ ./plugins/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Set working directory to the bot app
WORKDIR /app/apps/bot

# Run the bot
CMD ["pnpm", "start"]