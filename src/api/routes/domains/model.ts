import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { DB } from "../../../db";
import { z } from "zod";

export namespace DomainModel.GetDomain {
    export const Response = createSelectSchema(DB.Schema.domains)
    export type Response = z.infer<typeof Response>;
}

export namespace DomainModel.GetDomains {
    export const Response = z.array(DomainModel.GetDomain.Response);
    export type Response = z.infer<typeof Response>;
}

export namespace DomainModel.CreateDomain {

    export const Body = createInsertSchema(DB.Schema.domains, {
        subdomain: z.string()
            .min(3, 'Subdomain must be at least 3 characters')
            .max(50, 'Subdomain must be at most 50 characters')
            .regex(/^[a-zA-Z0-9-]+$/, 'Subdomain can only contain alphanumeric characters and hyphens'),
    })
    .omit({
        id: true,
        owner_id: true,
        last_ipv4: true,
        last_ipv6: true,
        last_ddns_update: true,
        ddnsv2_api_secret: true
    })

    export type Body = z.infer<typeof Body>;
}

export namespace DomainModel.UpdateDomain {

    export const Body = createUpdateSchema(DB.Schema.domains, {

        subdomain: z.string()
            .min(3, 'Subdomain must be at least 3 characters')
            .max(50, 'Subdomain must be at most 50 characters')
            .regex(/^[a-zA-Z0-9-]+$/, 'Subdomain can only contain alphanumeric characters and hyphens'),

        ddnsv2_api_secret: z.string()
            .min(8, 'API Secret must be at least 8 characters')
            .max(64, 'API Secret must be at most 64 characters')
            .regex(/^[a-zA-Z0-9-_.]+$/, 'API Secret can only contain alphanumeric characters, hyphens, dots and underscores'),

    }).omit({
        id: true,
        owner_id: true,
        last_ipv4: true,
        last_ipv6: true,
        last_ddns_update: true
    })
    .partial();

    export type Body = z.infer<typeof Body>;
}