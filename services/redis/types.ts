export interface RedisConfig {
    host: string;
    port: number;
    password: string;
  }
  
  export interface SessionData {
    userId: string;
    email: string;
    createdAt: number;
    expiresAt: number;
  }