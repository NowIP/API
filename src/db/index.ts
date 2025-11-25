import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as TableSchema from './schema';

export type DrizzleDB = ReturnType<typeof drizzle>;

export class DB {

    protected static db: DrizzleDB;

    static async init(path: string) {
        this.db = drizzle(path);

        this.db.insert(DB.Schema.systemConfigs).values({
            key: 'dns_serial',
            value: '0'
        }).onConflictDoNothing().run();
    }

    static instance() {
        if (!this.db) {
            throw new Error('Database not initialized. Call DB.init() first.');
        }
        return DB.db;
    }

}


export namespace DB.Schema {
    export const users = TableSchema.users;
    export const passwordResets = TableSchema.passwordResets;
    export const sessions = TableSchema.sessions;
    export const domains = TableSchema.domains;
    export const systemConfigs = TableSchema.systemConfigs;
}