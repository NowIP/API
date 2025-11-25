import z from "zod";

export const RecordDataSchemas = {

    A: z.object({
        address: z.ipv4(),
        ttl: z.number().optional()
    }),
    AAAA: z.object({
        address: z.ipv6(),
        ttl: z.number().optional()
    }),

    CNAME: z.object({
        domain: z.hostname(),
        ttl: z.number().optional()
    }),

    MX: z.object({
        exchange: z.hostname(),
        priority: z.number().min(0).max(65535),
        ttl: z.number().optional()
    }),

    NS: z.object({
        ns: z.hostname(),
        ttl: z.number().optional()
    }),

    PTR: z.object({
        domain: z.hostname(),
        ttl: z.number().optional()
    }),

    SOA: z.object({
        primary: z.hostname(),
        admin: z.string(),
        serial: z.number().int(),
        refresh: z.number().int(),
        retry: z.number().int(),
        expiration: z.number().int(),
        minimum: z.number().int(),
        ttl: z.number().optional()
    }),

    SRV: z.object({
        priority: z.number().min(0).max(65535),
        weight: z.number().min(0).max(65535),
        port: z.number().min(0).max(65535),
        target: z.hostname(),
        ttl: z.number().optional()
    }),

    TXT: z.object({
        data: z.union([z.string(), z.array(z.string())]),
        ttl: z.number().optional()
    }),

    SPF: z.object({
        data: z.union([z.string(), z.array(z.string())]),
        ttl: z.number().optional()
    }),

    CAA: z.object({
        flags: z.number().int().min(0).max(255),
        tag: z.string(),
        value: z.string(),
        ttl: z.number().optional()
    })

} as const;
