import { Hono } from "hono";
import { DB } from "../../../db";
import { APIRes } from "../../utils/api-res";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { randomBytes as crypto_randomBytes } from 'crypto';
import { router as records_router } from "./records";

export const router = new Hono().basePath('/domains');

router.get('/',
    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domains = DB.instance().select().from(DB.Schema.domains).where(eq(DB.Schema.domains.owner_id, session.user_id)).all();

        return APIRes.success(c, domains);
    }
);

router.post('/',
    zValidator("json", createInsertSchema(DB.Schema.domains, {
        subdomain: z.string().min(1).max(50),
    })
        .omit({ id: true, owner_id: true, last_ipv4: true, last_ipv6: true, ddnsv2_api_secret: true })
    ),
    async (c) => {
        const domainData = c.req.valid("json");
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const existingDomain = DB.instance().select().from(DB.Schema.domains).where(eq(DB.Schema.domains.subdomain, domainData.subdomain)).get();
        if (existingDomain) {
            return APIRes.conflict(c, "Domain with this subdomain already exists");
        }

        const result = DB.instance().insert(DB.Schema.domains).values({
            ...domainData,
            owner_id: session.user_id,
            ddnsv2_api_secret: crypto_randomBytes(16).toString('hex')
        }).returning().get();

        return APIRes.created(c, { id: result.id }, "Domain created successfully");
    }
);

router.use('/:id/*',
    zValidator("param", z.object({
        id: z.string().transform((val) => parseInt(val, 10))
    })),
    async (c, next) => {
        // @ts-ignore
        const { id } = c.req.valid("param");

        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domain = DB.instance().select().from(DB.Schema.domains).where(and(
            eq(DB.Schema.domains.id, id),
            eq(DB.Schema.domains.owner_id, session.user_id)
        )).get();

        if (!domain) {
            return APIRes.notFound(c, "Domain with specified ID not found");
        }
        // @ts-ignore
        c.set("domain", domain);

        await next();
    }
);

router.get('/:id',
    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        return APIRes.success(c, domain);
    }
);

router.delete('/:id',
    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        await DB.instance().delete(DB.Schema.domains).where(eq(DB.Schema.domains.id, domain.id));

        return APIRes.success(c, null, "Domain deleted successfully");
    }
);

router.put('/:id',
    zValidator("json", createUpdateSchema(DB.Schema.domains, {
        subdomain: z.string().min(1).max(50)
    })
        .omit({ id: true, owner_id: true, last_ipv4: true, last_ipv6: true })
    ),
    async (c) => {
        const domainData = c.req.valid("json");
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        await DB.instance().update(DB.Schema.domains).set({
            ...domainData
        }).where(eq(DB.Schema.domains.id, domain.id));

        return APIRes.success(c, null, "Domain updated successfully");
    }
);

router.route('/', records_router);