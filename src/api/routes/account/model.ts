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
    }).partial();

    export type Body = z.infer<typeof Body>;

}

export namespace AccountModel.UpdatePassword {

    export const Body = z.object({
        current_password: z.string().describe("Current password of the account"),
        new_password: z.string().min(8).describe("New password for the account (at least 8 characters)")
    });

    export type Body = z.infer<typeof Body>;

}