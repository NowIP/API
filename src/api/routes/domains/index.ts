import { Hono } from "hono";
import { DB } from "../../../db";
import { APIRes } from "../../utils/api-res";
import { eq } from "drizzle-orm";

export const router = new Hono().basePath('/domains');

router.get('/',
    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domains = DB.instance().select().from(DB.Schema.domains).where(eq(DB.Schema.domains.owner_id, session.user_id)).all();

        return APIRes.success(c, domains);
    }
);
