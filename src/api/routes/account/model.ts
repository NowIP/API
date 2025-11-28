import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { DB } from "../../../db";
import { z } from "zod";

export namespace AccountModel.GetInfo {

    export const Response = createSelectSchema(DB.Schema.users).omit({
        password_hash: true
    });
    export type Response = z.infer<typeof Response>;

}

export namespace AccountModel.UpdateInfo {

    export const Body = createUpdateSchema(DB.Schema.users).omit({
        id: true,
        password_hash: true
    }).extend({
        password: z.string().min(8).optional().describe("New password for the account (at least 8 characters)")
    });

    export type Body = z.infer<typeof Body>;

}