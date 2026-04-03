const session = require("express-session");
const MongoStore = require("connect-mongo");
const { DBClient } = require("nexord-db-client");
const { Logger } = require("nexord-sdk/utils");

class HybridSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        this.redis = DBClient.getInstance().redis;
        this.maxSessions = options.maxSessions || 100;
        this.ttl = options.ttl || 336 * 60 * 60; // 14 days in seconds
        this.prefix = "sess:";

        // MongoDB store as backup
        this.mongoStore = MongoStore.create({
            client: DBClient.getInstance().getMongoClient(),
            dbName: DBClient.getInstance().getDatabaseName(),
            collectionName: "dashboard.sessions",
            stringify: false,
            autoRemove: "interval",
            ttl: this.ttl,
        });
    }

    async get(sid, callback) {
        try {
            // Try Redis first
            const redisKey = this.prefix + sid;
            let session = await this.redis.get(redisKey);

            if (session) {
                // Update LRU position
                await this.redis.expire(redisKey, this.ttl);
                return callback(null, JSON.parse(session));
            }

            // Fallback to MongoDB
            this.mongoStore.get(sid, async (err, mongoSession) => {
                if (err) return callback(err);

                if (mongoSession) {
                    // Cache in Redis and maintain LRU
                    await this._setInRedis(sid, mongoSession);
                    Logger.debug(`Session ${sid} restored from MongoDB to Redis`);
                }

                callback(null, mongoSession);
            });
        } catch (error) {
            Logger.error("Session get error:", error);
            callback(error);
        }
    }

    async set(sid, session, callback) {
        try {
            // Save to both Redis and MongoDB
            await Promise.all([
                this._setInRedis(sid, session),
                new Promise((resolve, reject) => {
                    this.mongoStore.set(sid, session, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
            ]);

            callback && callback(null);
        } catch (error) {
            Logger.error("Session set error:", error);
            callback && callback(error);
        }
    }

    async destroy(sid, callback) {
        try {
            // Remove from both Redis and MongoDB
            await Promise.all([
                this.redis.del(this.prefix + sid),
                new Promise((resolve, reject) => {
                    this.mongoStore.destroy(sid, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
            ]);

            callback && callback(null);
        } catch (error) {
            Logger.error("Session destroy error:", error);
            callback && callback(error);
        }
    }

    async touch(sid, session, callback) {
        try {
            const redisKey = this.prefix + sid;
            const exists = await this.redis.exists(redisKey);

            if (exists) {
                // Update TTL in Redis
                await this.redis.expire(redisKey, this.ttl);
            } else {
                // Not in Redis, add it back
                await this._setInRedis(sid, session);
            }

            // Update in MongoDB
            this.mongoStore.touch(sid, session, callback);
        } catch (error) {
            Logger.error("Session touch error:", error);
            callback && callback(error);
        }
    }

    async _setInRedis(sid, session) {
        const redisKey = this.prefix + sid;

        // Check current session count in Redis
        const sessionCount = await this._getRedisSessionCount();

        if (sessionCount >= this.maxSessions) {
            // Evict oldest session (LRU)
            await this._evictOldestSession();
        }

        // Set session with TTL
        await this.redis.setex(redisKey, this.ttl, JSON.stringify(session));
    }

    async _getRedisSessionCount() {
        const keys = await this.redis.keys(this.prefix + "*");
        return keys.length;
    }

    async _evictOldestSession() {
        try {
            // Get all session keys with their TTL
            const keys = await this.redis.keys(this.prefix + "*");
            if (keys.length === 0) return;

            // Find key with lowest TTL (oldest)
            let oldestKey = null;
            let lowestTtl = Infinity;

            for (const key of keys) {
                const ttl = await this.redis.ttl(key);
                if (ttl < lowestTtl) {
                    lowestTtl = ttl;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                await this.redis.del(oldestKey);
                Logger.debug(`Evicted oldest session: ${oldestKey.replace(this.prefix, "")}`);
            }
        } catch (error) {
            Logger.error("Error evicting oldest session:", error);
        }
    }
}

function createSessionMiddleware(options = {}) {
    const store = new HybridSessionStore({
        maxSessions: options.maxSessions || 100,
        ttl: options.ttl || 336 * 60 * 60, // 14 days
    });

    return session({
        secret: process.env.SESSION_SECRET,
        cookie: { maxAge: (options.ttl || 336 * 60 * 60) * 1000 }, // Convert to milliseconds
        name: process.env.SESSION_COOKIE,
        resave: false,
        saveUninitialized: false,
        store: store,
        ...options,
    });
}

module.exports = {
    createSessionMiddleware,
    HybridSessionStore,
};
