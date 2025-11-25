import {
    sqliteTable,
    int,
    text
} from 'drizzle-orm/sqlite-core';

/**
 * @deprecated Use DB.Schema.users instead
 */
export const users = sqliteTable('users', {
    id: int().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    email: text().notNull().unique(),
    password_hash: text().notNull()
});

/**
 * @deprecated Use DB.Schema.passwordResets instead
 */
export const passwordResets = sqliteTable('password_resets', {
    token: text().primaryKey(),
    user_id: int().notNull().references(() => users.id),
    expires_at: int().notNull()
});

/**
 * @deprecated Use DB.Schema.sessions instead
 */
export const sessions = sqliteTable('sessions', {
    token: text().primaryKey(),
    user_id: int().notNull().references(() => users.id),
    expires_at: int().notNull()
});


/**
 * @deprecated Use DB.Schema.domains instead
 */
export const domains = sqliteTable('domains', {
    id: int().primaryKey({ autoIncrement: true }),
    owner_id: int().notNull().references(() => users.id),
    subdomain: text().notNull().unique(),
    last_ipv4: text(),
    last_ipv6: text(),
    ddnsv2_api_secret: text().notNull()
});

/**
 * @deprecated Use DB.Schema.systemConfigs instead
 */
export const systemConfigs = sqliteTable('system_configs', {
    key: text().primaryKey(),
    value: text().notNull()
});

