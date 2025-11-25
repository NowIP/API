import { Hono } from "hono";

import { Model } from './model'
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { validator } from "hono/validator";
import { DB } from "../../../db";
import { eq } from "drizzle-orm";
import { APIRes } from "../../utils/api-res";
import { SessionHandler } from "../../utils/sessionHandler";

export const router = new Hono().basePath('/auth');

router.post('/login',

    describeRoute({
        summary: "User Login",
        description: "Authenticate a user with their username and password",

        responses: {
            200: {
                description: "Login successful, returns session information",
                content: {
                    "application/json": {
                        schema: resolver(Model.Login.OKResponse)
                    }
                }
            },
            401: {
                description: "Invalid username or password",
                content: {
                    "application/json": {
                        schema: resolver(Model.Login.ErrorResponse)
                    }
                }
            },
        },

    }),

    zValidator("json", Model.Login.Body),
    
    async (c) => {
        const { username, password } = c.req.valid("json");

        const user = DB.instance().select().from(DB.Schema.users).where(eq(DB.Schema.users.username, username)).get();
        if (!user) {
            return APIRes.unauthorized(c, "Invalid username or password");
        }

        const passwordMatch = await Bun.password.verify(password, user.password_hash);
        if (!passwordMatch) {
            return APIRes.unauthorized(c, "Invalid username or password");
        }

        const session = await SessionHandler.createSession(user.id);

        return APIRes.success(c, session, "Login successful" );
    }
);