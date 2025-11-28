import { createSelectSchema } from "drizzle-zod";
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