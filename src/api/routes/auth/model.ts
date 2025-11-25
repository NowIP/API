import { success, z } from "zod";

export namespace Model.Login {

    export const Body = z.object({
        username: z.string(),
        password: z.string()
    });

    export type Body = z.infer<typeof Body>;

    export const OKResponse = z.object({
        success: z.literal(true),
        data : z.object({
            sessionToken: z.string()
        })
    });

    export type OKResponse = z.infer<typeof OKResponse>;

    export const ErrorResponse = z.object({
        success: z.literal(false),
        message: z.string()
    });

    export type ErrorResponse = z.infer<typeof ErrorResponse>;
}

