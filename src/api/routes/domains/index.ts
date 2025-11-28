import { Hono } from "hono";
import { DB } from "../../../db";
import { APIResponse } from "../../utils/api-res";
import { eq, and } from "drizzle-orm";
import { describeRoute, describeResponse, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { randomBytes as crypto_randomBytes } from 'crypto';
import { router as records_router } from "./records";
import { APIResponseSpec, APIRouteSpec } from "../../utils/specHelpers";
import { DomainModel } from "./model";

export const router = new Hono().basePath('/domains');

router.get('/',

    APIRouteSpec.authenticated({
        summary: "Get All Domains",
        description: "Retrieve a list of all domains owned by the authenticated user.",
        tags: ["Domains"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.success("Domains retrieved successfully", DomainModel.GetDomains.Response),
        )
    }),

    async (c) => {
        // @ts-ignore
        const session = c.get("session") as DB.Models.Session;

        const domains = DB.instance().select().from(DB.Schema.domains).where(eq(DB.Schema.domains.owner_id, session.user_id)).all();

        return APIResponse.success(c, "Domains retrieved successfully", domains);
    }
);

router.post('/',

    APIRouteSpec.authenticated({
        summary: "Create Domain",
        description: "Create a new domain under the authenticated user's account.",
        tags: ["Domains"],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.success("Domain created successfully", z.object({ id: z.number() })),
            APIResponseSpec.conflict("Conflict: Domain with this subdomain already exists")
        )
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
            return APIResponse.conflict(c, "Domain with this subdomain already exists");
        }

        const result = DB.instance().insert(DB.Schema.domains).values({
            ...domainData,
            owner_id: session.user_id,
            ddnsv2_api_secret: crypto_randomBytes(16).toString('hex')
        }).returning().get();

        return APIResponse.created(c, "Domain created successfully", { id: result.id });
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
            return APIResponse.notFound(c, "Domain with specified ID not found");
        }
        // @ts-ignore
        c.set("domain", domain);

        await next();
    }
);

router.get('/:domainID',

    APIRouteSpec.authenticated({
        summary: "Get Domain",
        description: "Retrieve details of a specific domain owned by the authenticated user.",
        tags: ["Domains"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.success("Domain retrieved successfully", DomainModel.GetDomain.Response),
            APIResponseSpec.notFound("Domain with specified ID not found")
        )

    }),

    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        return APIResponse.success(c, "Domain retrieved successfully", domain);
    }
);

router.put('/:domainID',

    APIRouteSpec.authenticated({
        summary: "Update Domain",
        description: "Update details of a specific domain owned by the authenticated user.",
        tags: ["Domains"],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.successNoData("Domain updated successfully"),
            APIResponseSpec.notFound("Domain with specified ID not found")
        )
    }),

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

        return APIResponse.successNoData(c, "Domain updated successfully");
    }
);

router.delete('/:domainID',

    APIRouteSpec.authenticated({
        summary: "Delete Domain",
        description: "Delete a specific domain owned by the authenticated user.",
        tags: ["Domains"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.successNoData("Domain deleted successfully"),
            APIResponseSpec.notFound("Domain with specified ID not found")
        )
    }),

    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        await DB.instance().delete(DB.Schema.domains).where(eq(DB.Schema.domains.id, domain.id));

        return APIResponse.successNoData(c, "Domain deleted successfully");
    }
);


router.route('/', records_router);