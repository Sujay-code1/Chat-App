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

redisClient.connect()
.then(() => console.log('Redis client connected'))
.catch((err) => {
  console.error('Redis connection failed:')
  console.error(err)
})

export default redisClient
