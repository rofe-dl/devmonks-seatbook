import Redis from 'ioredis';

/**
 * Singleton wrapper around an ioredis connection.
 *
 * Usage:
 *   import redis from './redis';
 *
 *   // on server start:
 *   await redis.connect();
 *
 *   // anywhere (safe to import before connect; commands queue until ready):
 *   await redis.set('key', 'value');
 *   const val = await redis.get('key');
 */
class RedisClient {
  private client: Redis | null = null;

  /**
   * Connect (idempotent). Resolves once the connection is ready,
   * rejects if it can't establish a connection within the retry window.
   */
  async connect(): Promise<void> {
    if (this.client && this.client.status === 'ready') return;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    // ioredis starts connecting immediately on construction.
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // Cap reconnect attempts; after that, stop and go to 'end'.
        if (times > 10) return null;
        return Math.min(times * 500, 5000);
      },
    });

    this.client.on('error', (err) => {
      console.error(`[redis] Error: ${err.message}`);
    });
    this.client.on('ready', () => {
      console.log('[redis] Connected');
    });
    this.client.on('reconnecting', (ms: number) => {
      console.log(`[redis] Reconnecting in ${ms}ms`);
    });

    // Wait until the connection is actually usable (or gives up).
    await new Promise<void>((resolve, reject) => {
      const client = this.client!;
      if (client.status === 'ready') return resolve();
      client.once('ready', () => resolve());
      client.once('end', () =>
        reject(new Error('Redis connection failed after retries'))
      );
    });
  }

  /** Get the underlying ioredis client (throws if not connected). */
  get raw(): Redis {
    if (!this.client) {
      throw new Error('Redis not connected. Call redis.connect() first.');
    }
    return this.client;
  }

  /** Close the connection gracefully. */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
      this.client = null;
      console.log('[redis] disconnected');
    }
  }

  get(key: string): Promise<string | null> {
    return this.raw.get(key);
  }

  set(key: string, value: string | number, ttlSeconds?: number): Promise<string> {
    return ttlSeconds
      ? this.raw.set(key, String(value), 'EX', ttlSeconds)
      : this.raw.set(key, String(value));
  }

  del(...keys: string[]): Promise<number> {
    return this.raw.del(...keys);
  }

  incr(key: string): Promise<number> {
    return this.raw.incr(key);
  }

  expire(key: string, ttlSeconds: number): Promise<number> {
    return this.raw.expire(key, ttlSeconds);
  }

  mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return Promise.resolve([]);
    return this.raw.mget(...keys);
  }

  hGet(key: string, field: string): Promise<string | null> {
    return this.raw.hget(key, field);
  }

  hSet(key: string, field: string, value: string | number): Promise<number> {
    return this.raw.hset(key, field, String(value));
  }
}

export default new RedisClient();
