import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { DB } from "../../../../db";
import { z } from "zod";
import { DNSRecordDataSchemas } from "../../../../dns-server/utils";

const DNSRecordSchemasUnionWithTypes = [
    z.object({
        type: z.literal("A"),
        record_data: DNSRecordDataSchemas.A
    }).meta({ title: "A Record Schema" }),

    z.object({
        type: z.literal("AAAA"),
        record_data: DNSRecordDataSchemas.AAAA
    }).meta({ title: "AAAA Record Schema" }),

    z.object({
        type: z.literal("CNAME"),
        record_data: DNSRecordDataSchemas.CNAME
    }).meta({ title: "CNAME Record Schema" }),

    z.object({
        type: z.literal("MX"),
        record_data: DNSRecordDataSchemas.MX
    }).meta({ title: "MX Record Schema" }),

    z.object({
        type: z.literal("SRV"),
        record_data: DNSRecordDataSchemas.SRV
    }).meta({ title: "SRV Record Schema" }),

    z.object({
        type: z.literal("TXT"),
        record_data: DNSRecordDataSchemas.TXT
    }).meta({ title: "TXT Record Schema" }),
    
    z.object({
        type: z.literal("SPF"),
        record_data: DNSRecordDataSchemas.SPF
    }).meta({ title: "SPF Record Schema" }),

    z.object({
        type: z.literal("CAA"),
        record_data: DNSRecordDataSchemas.CAA
    }).meta({ title: "CAA Record Schema" })
    
] as const;

export namespace RecordModel.GetRecord {

    const BaseRecordSchema = createSelectSchema(DB.Schema.additionalDnsRecords);

    const RecordVariants = DNSRecordSchemasUnionWithTypes.map((schema) =>
        BaseRecordSchema.extend(schema.shape)
    );

    export const Response = z.union(RecordVariants as [
        (typeof RecordVariants)[number],
        (typeof RecordVariants)[number],
        ...((typeof RecordVariants)[number])[]
    ]);

    export type Response = z.infer<typeof Response>;
}

export namespace RecordModel.GetRecords {
    export const Response = z.array(RecordModel.GetRecord.Response);
    export type Response = z.infer<typeof Response>;
}

export namespace RecordModel.CreateRecord {

    const BaseRecordSchema = createInsertSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string()
            .meta({ title: "Subdomain" })
            .min(1, 'Subdomain must be at least 1 character')
            .max(100, 'Subdomain must be at most 100 characters')
            .regex(/^[a-zA-Z0-9-_.]+$/, 'Subdomain can only contain alphanumeric characters, hyphens, underscores, and dots')
            .or(
                z.literal("@").meta({ title: "Root Domain" })
            )
    })
    .omit({ id: true, domain_id: true });

    const RecordVariants = DNSRecordSchemasUnionWithTypes.map((schema) =>
        BaseRecordSchema.extend(schema.shape)
    );

    export const Body = z.union(RecordVariants as [
        (typeof RecordVariants)[number],
        (typeof RecordVariants)[number],
        ...((typeof RecordVariants)[number])[]
    ]);

    export type Body = z.infer<typeof Body>;
}

export namespace RecordModel.UpdateRecord {

    const BaseRecordSchema = createUpdateSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string()
            .min(1, 'Subdomain must be at least 1 character')
            .max(100, 'Subdomain must be at most 100 characters')
            .regex(/^[a-zA-Z0-9-_.]+$/, 'Subdomain can only contain alphanumeric characters, hyphens, underscores, and dots')
            .or(
                z.literal("@").meta({ title: "Root Domain" })
            )
    })
    .omit({ id: true, domain_id: true })
    .partial();
    
    const RecordVariants = DNSRecordSchemasUnionWithTypes.map((schema) =>
        BaseRecordSchema.extend(schema.shape)
    );

    export const Body = z.union(RecordVariants as [
        (typeof RecordVariants)[number],
        (typeof RecordVariants)[number],
        ...((typeof RecordVariants)[number])[]
    ]);

    export type Body = z.infer<typeof Body>;
}