import { redisClient } from './redisClient.js'

const memory = new Map<string, string>()
let fallback = false

export async function set(key: string, value: string, opts?: { EX?: number }) {
  try {
    if (fallback) {
      memory.set(key, value)
      return
    }
    if (opts && typeof opts.EX === 'number') {
      await redisClient.set(key, value, { EX: opts.EX })
    } else {
      await redisClient.set(key, value)
    }
  } catch (err: any) {
    if (err?.message && /NOPERM|no permissions|readonly/i.test(err.message)) {
      fallback = true
      memory.set(key, value)
      return
    }
    throw err
  }
}

export async function get(key: string): Promise<string | null> {
  try {
    if (fallback) return memory.get(key) ?? null
    const v = await redisClient.get(key)
    return v
  } catch (err: any) {
    if (err?.message && /NOPERM|no permissions|readonly/i.test(err.message)) {
      fallback = true
      return memory.get(key) ?? null
    }
    throw err
  }
}

export async function del(key: string): Promise<number | null> {
  try {
    if (fallback) {
      const existed = memory.has(key)
      memory.delete(key)
      return existed ? 1 : 0
    }
    const v = await redisClient.del(key)
    return v
  } catch (err: any) {
    if (err?.message && /NOPERM|no permissions|readonly/i.test(err.message)) {
      fallback = true
      const existed = memory.has(key)
      memory.delete(key)
      return existed ? 1 : 0
    }
    throw err
  }
}

export function clearMemory() {
  memory.clear()
}

export default { get, set, del, clearMemory }
