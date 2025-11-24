import {
    sqliteTable,
    int,
    text
} from 'drizzle-orm/sqlite-core'


export const usersTable = sqliteTable('users', {
    id: int().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    email: text().notNull().unique(),
    passwordHash: text().notNull()
});

export const passwordResetsTable = sqliteTable('password_resets', {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int().notNull().references(() => usersTable.id),
    resetToken: text().notNull().unique(),
    expiresAt: int().notNull()
});

export const domainsTable = sqliteTable('domains', {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int().notNull().references(() => usersTable.id),
    domainName: text().notNull().unique()
});

export const systemConfigsTable = sqliteTable('system_configs', {
    key: text().primaryKey(),
    value: text().notNull()
});

// export const TableSchema = {
//     usersTable,
//     domainsTable,
//     passwordResetsTable
// };
