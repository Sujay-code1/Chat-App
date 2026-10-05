import dotenv from 'dotenv'
import { createClient } from 'redis'

dotenv.config()

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in the environment variables')
}

if (/(_ro|default_ro|:ro)/i.test(redisUrl)) {
  console.warn('WARNING: REDIS_URL appears to be read-only (Upstash read-only token). Redis write commands like SET will fail. Replace with a write-enabled URL.')
}

export const redisClient = createClient({ url: redisUrl })

redisClient.on('error', (error) => {
  console.error('Redis client error:', error instanceof Error ? error.message : error)
})

export async function connectRedis() {
  if (redisClient.isOpen) return

  try {
    await redisClient.connect()
    await redisClient.ping()
    console.log('Redis client connected and ready')
  } catch (error) {
    console.error(
      'Redis connection failed:',
      error instanceof Error ? error.message : error,
    )
    throw error
  }
}

export default redisClient
