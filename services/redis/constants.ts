

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
} as const
  
export const KEY_PREFIXES = {
  SESSION: 'session:',
  USER: 'user:',
  EMAIL_VERIFICATION: 'email_verification:'
} as const;

export const TTL = {
  SESSION: 60 * 60 * 24 * 7, // 7 days
  EMAIL_VERIFICATION: 60 * 60 * 24 // 24 hours
} as const;