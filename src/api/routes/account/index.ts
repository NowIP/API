import { Hono } from "hono";
import { AccountModel } from './model'
import { validator } from "hono-openapi";
import { DB } from "../../../db";
import { eq } from "drizzle-orm";
import { APIResponse } from "../../utils/api-res";
import { APIResponseSpec, APIRouteSpec } from "../../utils/specHelpers";
import { SessionHandler } from "../../utils/sessionHandler";

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

        DB.instance().update(DB.Schema.users).set(body).where(
            eq(DB.Schema.users.id, session.user_id)
        ).run();

        return APIResponse.successNoData(c, "Account information updated successfully");
    },
);

router.put('/password',

    APIRouteSpec.authenticated({
        summary: "Change account password",
        description: "Change the password of the authenticated user's account.",
        tags: ['Account'],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.successNoData("Password changed successfully"),
            APIResponseSpec.unauthorized("Current password is incorrect")
        )
    }),

    validator("json", AccountModel.UpdatePassword.Body),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const body = c.req.valid("json")

        const user = DB.instance().select().from(DB.Schema.users).where(
            eq(DB.Schema.users.id, session.user_id)
        ).get();
    
        if (!user) {
            throw new Error("User not found but session exists");
        }

        if ((await Bun.password.verify(body.current_password, user.password_hash)) === false) {
            return APIResponse.unauthorized(c, "Current password is incorrect");
        }

        const newPasswordHash = await Bun.password.hash(body.new_password);

        DB.instance().update(DB.Schema.users).set({
            password_hash: newPasswordHash
        }).where(
            eq(DB.Schema.users.id, session.user_id)
        ).run();

        SessionHandler.inValidateAllSessionsForUser(session.user_id);

        return APIResponse.successNoData(c, "Password changed successfully");
    },
);

router.post('/logout',

    APIRouteSpec.authenticated({
        summary: "Logout from current session",
        description: "Logs out the authenticated user from the current session.",
        tags: ['Account'],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.successNoData("Logged out successfully")
        )
    }),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        DB.instance().delete(DB.Schema.sessions).where(
            eq(DB.Schema.sessions.id, session.id)
        ).run();

        return APIResponse.successNoData(c, "Logged out successfully");
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