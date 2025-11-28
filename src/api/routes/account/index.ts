import { Hono } from "hono";
import { AccountModel } from './model'
import { validator } from "hono-openapi";
import { DB } from "../../../db";
import { eq } from "drizzle-orm";
import { APIResponse } from "../../utils/api-res";
import { APIResponseSpec, APIRouteSpec } from "../../utils/specHelpers";
import { de } from "zod/v4/locales";

export const router = new Hono().basePath('/account');

router.get('/',

    APIRouteSpec.authenticated({
        summary: "Get account information",
        description: "Retrieve information about the authenticated user's account.",
        tags: ['Account'],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.success("Account information retrieved successfully", AccountModel.GetInfo.Response)
        )
    }),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const user = DB.instance().select().from(DB.Schema.users).where(
            eq(DB.Schema.users.id, session.user_id)
        ).get();

        if (!user) {
            throw new Error("User not found but session exists");
        }

        const userWithoutSensitive = AccountModel.GetInfo.Response.parse(user);

        return APIResponse.success(c, "Account information retrieved successfully", userWithoutSensitive);
    },
);

router.put('/',

    APIRouteSpec.authenticated({
        summary: "Update account information",
        description: "Update information about the authenticated user's account.",
        tags: ['Account'],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.successNoData("Account information updated successfully")
        )
    }),

    validator("json", AccountModel.UpdateInfo.Body),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const body = c.req.valid("json") as AccountModel.UpdateInfo.Body;

        const updateData: Partial<DB.Models.User> = {
            ...body
        }

        if (body.password) {
            // @ts-ignore
            delete updateData.password;
            updateData.password_hash = await Bun.password.hash(body.password);
        }

        DB.instance().update(DB.Schema.users).set(updateData).where(
            eq(DB.Schema.users.id, session.user_id)
        ).run();

        return APIResponse.successNoData(c, "Account information updated successfully");
    },
);

router.delete('/',

    APIRouteSpec.authenticated({
        summary: "Delete account",
        description: "Permanently delete the authenticated user's account.",
        tags: ['Account'],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.successNoData("Account deleted successfully")
        )
    }),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        DB.instance().delete(DB.Schema.users).where(
            eq(DB.Schema.users.id, session.user_id)
        ).run();

        return APIResponse.successNoData(c, "Account deleted successfully");
    },
);