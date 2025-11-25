import { Hono } from "hono";
import { DB } from "../../../db";

export const router = new Hono().basePath('/domains');

router.get('/',
    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;
    }
);
