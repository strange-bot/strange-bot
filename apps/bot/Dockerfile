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

# TODO: Temporarily link local packages for development
RUN cd packages/strange-core && yarn link && \
    cd ../strange-db-client && yarn link && \
    cd ../strange-sdk && yarn link

# Install dependencies
RUN pnpm install --frozen-lockfile

# Run the bot
CMD ["pnpm", "start:bot"]