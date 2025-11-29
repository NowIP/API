import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { DB } from "../../../../db";
import { z } from "zod";
import { DNSRecordDataSchemas } from "../../../../dns-server/utils";

export namespace RecordModel.GetRecord {
    export const Response = createSelectSchema(DB.Schema.additionalDnsRecords)
    export type Response = z.infer<typeof Response>;
}

export namespace RecordModel.GetRecords {
    export const Response = z.array(RecordModel.GetRecord.Response);
    export type Response = z.infer<typeof Response>;
}

export namespace RecordModel.CreateRecord {

    export const Body = createInsertSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string()
            .min(1, 'Subdomain must be at least 1 character')
            .max(100, 'Subdomain must be at most 100 characters')
            .regex(/^[a-zA-Z0-9-_.]+$/, 'Subdomain can only contain alphanumeric characters, hyphens, underscores, and dots')
            .or(z.literal("@")),

        record_data: DNSRecordDataSchemas.A
            .or(DNSRecordDataSchemas.AAAA)
            .or(DNSRecordDataSchemas.CNAME)

            .or(DNSRecordDataSchemas.MX)

            .or(DNSRecordDataSchemas.SRV)

            .or(DNSRecordDataSchemas.TXT)
            .or(DNSRecordDataSchemas.SPF)

            .or(DNSRecordDataSchemas.CAA)
    })
    .omit({ id: true, domain_id: true });

    export type Body = z.infer<typeof Body>;
}

export namespace RecordModel.UpdateRecord {
    export const Body = createUpdateSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string()
            .min(1, 'Subdomain must be at least 1 character')
            .max(100, 'Subdomain must be at most 100 characters')
            .regex(/^[a-zA-Z0-9-_.]+$/, 'Subdomain can only contain alphanumeric characters, hyphens, underscores, and dots')
            .or(z.literal("@")),

        record_data: DNSRecordDataSchemas.A
            .or(DNSRecordDataSchemas.AAAA)
            .or(DNSRecordDataSchemas.CNAME)

            .or(DNSRecordDataSchemas.MX)

            .or(DNSRecordDataSchemas.SRV)

            .or(DNSRecordDataSchemas.TXT)
            .or(DNSRecordDataSchemas.SPF)

            .or(DNSRecordDataSchemas.CAA)
    })
    .omit({ id: true, domain_id: true })
    .partial();

    export type Body = z.infer<typeof Body>;
}