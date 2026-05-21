import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

export const connectRedis = async (): Promise<RedisClientType> => {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  }) as RedisClientType

  redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error:', err)
  })

  redisClient.on('connect', () => {
    console.log('Redis Client Connected')
  })

  await redisClient.connect()
  return redisClient
}

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.')
  }
  return redisClient
}

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.disconnect()
    redisClient = null
  }
}
