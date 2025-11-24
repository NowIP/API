import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';


export type DrizzleDB = ReturnType<typeof drizzle>;

export class DB {

    protected static db: DrizzleDB;

    static async init(path: string) {
        this.db = drizzle(path);
    }

    static get() {
        if (!this.db) {
            throw new Error('Database not initialized. Call DB.init() first.');
        }
        return DB.db;
    }

}
