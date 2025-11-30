import { Hono } from "hono";
import { validator as zValidator } from "hono-openapi";
import { z } from "zod";
import { DB } from "../../../../db";
import { eq, and } from "drizzle-orm";
import { APIResponse } from "../../../utils/api-res";
import { DNSRecordDataSchemas } from "../../../../dns-server/utils";
import { APIResponseSpec, APIRouteSpec } from "../../../utils/specHelpers";
import { RecordModel } from "./model";

export const router = new Hono().basePath('/:domainID/records');

router.get('/',

    APIRouteSpec.authenticated({
        summary: "Get All DNS Records for Domain",
        description: "Retrieve a list of all additional DNS records for the specified domain owned by the authenticated user.",
        tags: ["DNS Records"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.success("Records retrieved successfully", RecordModel.GetRecords.Response)
        )
    }),

    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        const records = DB.instance().select().from(DB.Schema.additionalDnsRecords).where(and(
            eq(DB.Schema.additionalDnsRecords.domain_id, domain.id)
        )).all();

        return APIResponse.success(c, "Records retrieved successfully", records);
    }
);


router.post('/',

    APIRouteSpec.authenticated({
        summary: "Create DNS Record for Domain",
        description: "Create a new additional DNS record for the specified domain owned by the authenticated user.",
        tags: ["DNS Records"],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.success("DNS record created successfully", z.object({ id: z.number() })),
            APIResponseSpec.badRequest("Bad Request: Invalid DNS record data or subdomain"),
        )
    }),

    zValidator("json", RecordModel.CreateRecord.Body),

    async (c) => {
        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        const recordData = c.req.valid("json");

        if (recordData.subdomain === "@") {
            if (recordData.type === "CNAME") {
                return APIResponse.badRequest(c, "The '@' subdomain cannot have CNAME records as it would conflict with the domain apex records");
            }
            if (recordData.type === "A" || recordData.type === "AAAA") {
                return APIResponse.badRequest(c, "The '@' subdomain cannot have A or AAAA records as they would conflict with the ddns generated records");
            }
        }

        // const recordSchema = DNSRecordDataSchemas[recordData.type as keyof typeof DNSRecordDataSchemas];
        // if (!recordSchema) {
        //     return APIResponse.badRequest(c, "Unsupported DNS record type");
        // }

        // const parseResult = recordSchema.safeParse(recordData.record_data);
        // if (!parseResult.success) {
        //     return APIResponse.badRequest(c, "Invalid DNS record data for type " + recordData.type);
        // }

        const result = DB.instance().insert(DB.Schema.additionalDnsRecords).values({
            ...recordData as any,
            domain_id: domain.id
        }).returning().get();

        return APIResponse.created(c, "DNS record created successfully", { id: result.id });
    }   
);

router.use('/:recordID/*',

    zValidator("param", z.object({
        recordID: z.string().transform((val) => parseInt(val, 10))
    })),

    async (c, next) => {
        // @ts-ignore
        const { recordID } = c.req.valid("param");

        // @ts-ignore
        const domain = c.get("domain") as DB.Models.Domain;

        const record = DB.instance().select().from(DB.Schema.additionalDnsRecords).where(and(
            eq(DB.Schema.additionalDnsRecords.id, recordID),
            eq(DB.Schema.additionalDnsRecords.domain_id, domain.id)
        )).get();

        if (!record) {
            return APIResponse.notFound(c, "Record with specified ID not found");
        }
        // @ts-ignore
        c.set("record", record);

        await next();
    }
);

router.get('/:recordID',

    APIRouteSpec.authenticated({
        summary: "Get DNS Record",
        description: "Retrieve details of a specific additional DNS record for the specified domain owned by the authenticated user.",
        tags: ["DNS Records"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.success("Record retrieved successfully", RecordModel.GetRecord.Response),
            APIResponseSpec.notFound("Record with specified ID not found")
        )
    }),

    async (c) => {
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        return APIResponse.success(c, "Record retrieved successfully", record);
    }
);

router.put('/:recordID',

    APIRouteSpec.authenticated({
        summary: "Update DNS Record",
        description: "Update a specific additional DNS record for the specified domain owned by the authenticated user.",
        tags: ["DNS Records"],

        responses: APIResponseSpec.describeWithWrongInputs(
            APIResponseSpec.successNoData("Record updated successfully"),
            APIResponseSpec.notFound("Record with specified ID not found")
        )
    }),

    zValidator("json", RecordModel.UpdateRecord.Body),

    async (c) => {
        const recordData = c.req.valid("json");
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        if (recordData.subdomain === "@") {
            if (recordData.type === "CNAME") {
                return APIResponse.badRequest(c, "The '@' subdomain cannot have CNAME records as it would conflict with the domain apex records");
            }
            if (recordData.type === "A" || recordData.type === "AAAA") {
                return APIResponse.badRequest(c, "The '@' subdomain cannot have A or AAAA records as they would conflict with the ddns generated records");
            }
        }

        // const recordSchema = DNSRecordDataSchemas[(recordData.type ?? record.type) as keyof typeof DNSRecordDataSchemas];
        // if (!recordSchema) {
        //     return APIResponse.badRequest(c, "Unsupported DNS record type");
        // }

        // const parseResult = recordSchema.safeParse(recordData.record_data ?? record.record_data);
        // if (!parseResult.success) {
        //     return APIResponse.badRequest(c, "Invalid DNS record data for type " + (recordData.type ?? record.type));
        // }
        
        await DB.instance().update(DB.Schema.additionalDnsRecords).set(recordData as any)
            .where(eq(DB.Schema.additionalDnsRecords.id, record.id));

        return APIResponse.successNoData(c, "Record updated successfully");
    }
);

router.delete('/:recordID',

    APIRouteSpec.authenticated({
        summary: "Delete DNS Record",
        description: "Delete a specific additional DNS record for the specified domain owned by the authenticated user.",
        tags: ["DNS Records"],

        responses: APIResponseSpec.describeBasic(
            APIResponseSpec.successNoData("Record deleted successfully"),
            APIResponseSpec.notFound("Record with specified ID not found")
        )
    }),

    async (c) => {
        // @ts-ignore
        const record = c.get("record") as DB.Models.AdditionalDNSRecord;

        await DB.instance().delete(DB.Schema.additionalDnsRecords).where(eq(DB.Schema.additionalDnsRecords.id, record.id));

        return APIResponse.successNoData(c, "Record deleted successfully");
    }
);