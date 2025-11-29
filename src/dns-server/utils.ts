import { z } from "zod";

export const DNSRecordDataSchemas = {

    A: z.object({
        address: z.ipv4(),
        ttl: z.number().min(0).max(86400).optional()
    }),
    AAAA: z.object({
        address: z.ipv6(),
        ttl: z.number().min(0).max(86400).optional()
    }),

    CNAME: z.object({
        domain: z.hostname().min(1).max(253),
        ttl: z.number().min(0).max(86400).optional()
    }),

    MX: z.object({
        exchange: z.hostname().min(1).max(253),
        priority: z.number().min(0).max(65535),
        ttl: z.number().min(0).max(86400).optional()
    }),

    // NS: z.object({
    //     ns: z.hostname().min(1).max(253),
    //     ttl: z.number().min(0).max(86400).optional()
    // }),

    // PTR: z.object({
    //     domain: z.hostname().min(1).max(253),
    //     ttl: z.number().min(0).max(86400).optional()
    // }),

    // SOA: z.object({
    //     primary: z.hostname().min(1).max(253),
    //     admin: z.string(),
    //     serial: z.number().int(),
    //     refresh: z.number().int(),
    //     retry: z.number().int(),
    //     expiration: z.number().int(),
    //     minimum: z.number().int(),
    //     ttl: z.number().min(0).max(86400).optional()
    // }),

    SRV: z.object({
        priority: z.number().min(0).max(65535),
        weight: z.number().min(0).max(65535),
        port: z.number().min(0).max(65535),
        target: z.hostname().min(1).max(253),
        ttl: z.number().min(0).max(86400).optional()
    }),

    TXT: z.object({
        data: z.union([z.string(), z.array(z.string())]),
        ttl: z.number().min(0).max(86400).optional()
    }),

    SPF: z.object({
        data: z.union([z.string(), z.array(z.string())]),
        ttl: z.number().min(0).max(86400).optional()
    }),

    CAA: z.object({
        flags: z.number().int().min(0).max(255),
        tag: z.string(),
        value: z.string(),
        ttl: z.number().min(0).max(86400).optional()
    })

} as const;

export const DNSRecordSchemasUnion = z.union([
    DNSRecordDataSchemas.A,
    DNSRecordDataSchemas.AAAA,
    DNSRecordDataSchemas.CNAME,

    DNSRecordDataSchemas.MX,

    DNSRecordDataSchemas.SRV,

    DNSRecordDataSchemas.TXT,
    DNSRecordDataSchemas.SPF,

    DNSRecordDataSchemas.CAA
]);

export namespace DNSRecordDataSchemas {
    
    export type Type = {
        [K in keyof typeof DNSRecordDataSchemas]: z.infer<typeof DNSRecordDataSchemas[K]>
    };

    export type RecordDataType<T extends keyof typeof DNSRecordDataSchemas> = z.infer<typeof DNSRecordDataSchemas[T]>;

    export type RecordData = RecordDataType<keyof typeof DNSRecordDataSchemas>;

}

export const DNSRecordDataSchemasNames = Object.keys(DNSRecordDataSchemas) as (keyof typeof DNSRecordDataSchemas)[];


