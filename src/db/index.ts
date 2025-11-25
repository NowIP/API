import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as TableSchema from './schema';
import crypto from 'crypto';

export type DrizzleDB = ReturnType<typeof drizzle>;

export class DB {

    protected static db: DrizzleDB;

    static async init(path: string) {
        this.db = drizzle(path);

        await this.createInitialSystemConfigsIfNeeded();
        await this.createInitialAdminUserIfNeeded();
    }

    static async createInitialAdminUserIfNeeded() {
        const usersTableEmpty = (await this.db.select().from(DB.Schema.users).limit(1)).length === 0;
        if (!usersTableEmpty) return;

        const username = "admin";
        const randomPassword = crypto.randomBytes(32).toString('hex');

        await this.db.insert(DB.Schema.users).values({
            username,
            email: "admin@nowip.local",
            password_hash: await Bun.password.hash(randomPassword)
        });

        Bun.file('./data/initial_admin_credentials.txt').write(`Username: ${username}\nPassword: ${randomPassword}\n`);

        console.log(`Initial admin user created with username: ${username} and password: ${randomPassword} (also saved to ./data/initial_admin_credentials.txt)`);
    }

    static async createInitialSystemConfigsIfNeeded() {
        await this.db.insert(DB.Schema.systemConfigs).values({
            key: 'dns_serial',
            value: '0'
        }).onConflictDoNothing();
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
    export const sessions = TableSchema.sessions;
    export const passwordResets = TableSchema.passwordResets;

    export const domains = TableSchema.domains;

    export const systemConfigs = TableSchema.systemConfigs;
}

export namespace DB.Models {
    export type User = typeof DB.Schema.users.$inferSelect;
    export type Session = typeof DB.Schema.sessions.$inferSelect;
    export type PasswordReset = typeof DB.Schema.passwordResets.$inferSelect;

    export type Domain = typeof DB.Schema.domains.$inferSelect;

    export type SystemConfig = typeof DB.Schema.systemConfigs.$inferSelect;
}