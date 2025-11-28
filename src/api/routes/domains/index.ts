import { Hono } from "hono";
import { DB } from "../../../db";
import { APIRes } from "../../utils/api-res";
import { eq, and } from "drizzle-orm";
import { describeRoute, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { randomBytes as crypto_randomBytes } from 'crypto';
import { router as records_router } from "./records";

export const router = new Hono().basePath('/domains');

router.get('/',

    describeRoute({
        summary: "List Domains",
        description: "Retrieve a list of all domains owned by the authenticated user.",
        tags: ["Domains"],

        responses: {
            200: {
                description: "A list of domains owned by the user",
            },
            401: {
                description: "Authentication information is missing or invalid",
            },
        },
    }),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domains = DB.instance().select().from(DB.Schema.domains).where(eq(DB.Schema.domains.owner_id, session.user_id)).all();

        return APIRes.success(c, domains);
    }
);

router.post('/',

    describeRoute({
        summary: "Create Domain",
        description: "Create a new domain under the authenticated user's account.",
        tags: ["Domains"],
    }),

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

router.use('/:domainID/*',
    zValidator("param", z.object({
        domainID: z.string().transform((val) => parseInt(val, 10))
    })),
    async (c, next) => {
        // @ts-ignore
        const { domainID } = c.req.valid("param");

        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domain = DB.instance().select().from(DB.Schema.domains).where(and(
            eq(DB.Schema.domains.id, domainID),
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

router.get('/:domainID',
    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        return APIRes.success(c, domain);
    }
);

router.delete('/:domainID',
    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        await DB.instance().delete(DB.Schema.domains).where(eq(DB.Schema.domains.id, domain.id));

        return APIRes.success(c, null, "Domain deleted successfully");
    }
);

router.put('/:domainID',
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