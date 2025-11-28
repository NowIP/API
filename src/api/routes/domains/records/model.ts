import { createSelectSchema } from "drizzle-zod";
import { DB } from "../../../../db";
import { z } from "zod";

export namespace RecordModel.GetRecord {
    export const Response = createSelectSchema(DB.Schema.additionalDnsRecords)
    export type Response = z.infer<typeof Response>;
}

export namespace RecordModel.GetRecords {
    export const Response = z.array(RecordModel.GetRecord.Response);
    export type Response = z.infer<typeof Response>;
}