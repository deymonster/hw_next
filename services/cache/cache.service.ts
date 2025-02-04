type CacheData = {
    [key: string]: {
        value: any;
        expiresAt: number;
    };
};

export class CacheService {
    private cache: CacheData = {};

    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        this.cache[key] = {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        };
    }

    async get(key: string): Promise<any> {
        const data = this.cache[key];
        
        if (!data) {
            return null;
        }

        if (Date.now() > data.expiresAt) {
            delete this.cache[key];
            return null;
        }

        return data.value;
    }

    async delete(key: string): Promise<void> {
        delete this.cache[key];
    }
}
