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
    passwordHash: text().notNull()
});

/**
 * @deprecated Use TableSchema.passwordResets instead
 */
export const passwordResets = sqliteTable('password_resets', {
    id: int().primaryKey({ autoIncrement: true }),
    userID: int().notNull().references(() => users.id),
    resetToken: text().notNull().unique(),
    expiresAt: int().notNull()
});

/**
 * @deprecated Use TableSchema.domains instead
 */
export const domains = sqliteTable('domains', {
    id: int().primaryKey({ autoIncrement: true }),
    ownerID: int().notNull().references(() => users.id),
    subdomain: text().notNull().unique(),
    lastIPv4: text(),
    lastIPv6: text()
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
    systemConfigs
};
