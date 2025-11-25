import {
    sqliteTable,
    int,
    text
} from 'drizzle-orm/sqlite-core'

/**
 * @deprecated Use TableSchema.users instead
 */
export const users = sqliteTable('users', {
    id: int().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    email: text().notNull().unique(),
    password_hash: text().notNull()
});

/**
 * @deprecated Use TableSchema.passwordResets instead
 */
export const passwordResets = sqliteTable('password_resets', {
    id: int().primaryKey({ autoIncrement: true }),
    user_id: int().notNull().references(() => users.id),
    reset_token: text().notNull().unique(),
    expires_at: int().notNull()
});

/**
 * @deprecated Use TableSchema.sessions instead
 */
export const sessions = sqliteTable('sessions', {
    id: int().primaryKey({ autoIncrement: true }),
    user_id: int().notNull().references(() => users.id),
    session_token: text().notNull().unique(),
    expires_at: int().notNull()
});


/**
 * @deprecated Use TableSchema.domains instead
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
 * @deprecated Use TableSchema.systemConfigs instead
 */
export const systemConfigs = sqliteTable('system_configs', {
    key: text().primaryKey(),
    value: text().notNull()
});

export const TableSchema = {
    users,
    domains,
    passwordResets,
    sessions,
    systemConfigs
};
