import { z } from "zod";

export namespace Model.Login {

    export const Body = z.object({
        username: z.string(),
        password: z.string()
    });
    export type Body = z.infer<typeof Body>;

    export const Response = z.object({
        sessionToken: z.string()
    });
    export type Response = z.infer<typeof Response>;
}

