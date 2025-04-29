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

# Copy the dashboard app and any shared packages it depends on
COPY apps/dashboard/ ./apps/dashboard/
COPY packages/ ./packages/
COPY plugins/ ./plugins/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Set working directory to the dashboard app
WORKDIR /app/apps/dashboard

# Run the dashboard
CMD ["pnpm", "start"]