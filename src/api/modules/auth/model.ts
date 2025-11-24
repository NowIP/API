import z from "zod";

export namespace AuthModel {

    export namespace Login {

        export const Body = z.object({
            username: z.string(),
            password: z.string(),
        });

        export type Body = z.infer<typeof Body>;

    }

}
