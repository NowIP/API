import { Hono } from "hono";

import { Model } from './model'
import { zValidator } from "@hono/zod-validator";

export const router = new Hono().basePath('/auth');

router.get('/login',
    zValidator("json", Model.Login.Body),
    async (c) => {

        const { username, password } = c.req.valid("json");
        
    }
);