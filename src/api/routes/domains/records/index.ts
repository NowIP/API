import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DB } from "../../../../db";
import { eq, and } from "drizzle-orm";
import { APIRes } from "../../../utils/api-res";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { DNSRecordDataSchemas } from "../../../../dns-server/utils";

export const router = new Hono().basePath('/:id/records');

router.get('/',

    zValidator("param", z.object({
        id: z.string().transform((val) => parseInt(val, 10))
    })),

    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        const records = DB.instance().select().from(DB.Schema.additionalDnsRecords).where(and(
            eq(DB.Schema.additionalDnsRecords.domain_id, domain.id)
        )).all();

        return APIRes.success(c, records); 
    }
);


router.post('/',

    zValidator("json", createInsertSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string().min(1).max(50),
    })
        .omit({ id: true, domain_id: true })
    ),
    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        const recordData = c.req.valid("json");

        if (recordData.subdomain === "@") {
            if (recordData.type === "CNAME") {
                return APIRes.badRequest(c, "The '@' subdomain cannot have CNAME records as it would conflict with the domain apex records");
            }
            if (recordData.type === "A" || recordData.type === "AAAA") {
                return APIRes.badRequest(c, "The '@' subdomain cannot have A or AAAA records as they would conflict with the ddns generated records");
            }
        }

        const recordSchema = DNSRecordDataSchemas[recordData.type as keyof typeof DNSRecordDataSchemas];
        if (!recordSchema) {
            return APIRes.badRequest(c, "Unsupported DNS record type");
        }

        const parseResult = recordSchema.safeParse(recordData.record_data);
        if (!parseResult.success) {
            return APIRes.badRequest(c, "Invalid DNS record data for type " + recordData.type);
        }

        DB.instance().insert(DB.Schema.additionalDnsRecords).values({
            ...recordData,
            domain_id: domain.id
        }).returning().get();

        return APIRes.created(c, "DNS record created successfully");
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
        const domain = c.get("domain") as DB.Models.Domain;

        const record = DB.instance().select().from(DB.Schema.additionalDnsRecords).where(and(
            eq(DB.Schema.additionalDnsRecords.id, id),
            eq(DB.Schema.additionalDnsRecords.domain_id, domain.id)
        )).get();

        if (!record) {
            return APIRes.notFound(c, "Record with specified ID not found");
        }
        // @ts-ignore
        c.set("record", record);

        await next();
    }
);

router.get('/:id',
    async (c) => {
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        console.log(record);

        return APIRes.success(c, record);
    }
);

router.delete('/:id',
    async (c) => {
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        await DB.instance().delete(DB.Schema.additionalDnsRecords).where(eq(DB.Schema.additionalDnsRecords.id, record.id));

        return APIRes.success(c, null, "Record deleted successfully");
    }
);

router.put('/:id',
    zValidator("json", createUpdateSchema(DB.Schema.additionalDnsRecords, {
        subdomain: z.string().min(1).max(50),
    }).omit({ id: true, domain_id: true })),
    async (c) => {
        const recordData = c.req.valid("json");
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        if (recordData.subdomain === "@") {
            if (recordData.type === "CNAME") {
                return APIRes.badRequest(c, "The '@' subdomain cannot have CNAME records as it would conflict with the domain apex records");
            }
            if (recordData.type === "A" || recordData.type === "AAAA") {
                return APIRes.badRequest(c, "The '@' subdomain cannot have A or AAAA records as they would conflict with the ddns generated records");
            }
        }

        const recordSchema = DNSRecordDataSchemas[(recordData.type ?? record.type) as keyof typeof DNSRecordDataSchemas];
        if (!recordSchema) {
            return APIRes.badRequest(c, "Unsupported DNS record type");
        }

        const parseResult = recordSchema.safeParse(recordData.record_data ?? record.record_data);
        if (!parseResult.success) {
            return APIRes.badRequest(c, "Invalid DNS record data for type " + (recordData.type ?? record.type));
        }
        
        await DB.instance().update(DB.Schema.additionalDnsRecords).set({
            ...recordData
        }).where(eq(DB.Schema.additionalDnsRecords.id, record.id));

        return APIRes.success(c, null, "Record updated successfully");
    }
);
