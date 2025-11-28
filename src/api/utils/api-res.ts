import { Context } from "hono";
import { z } from "zod";

export class APIResponse {

    static success<Data extends APIResponse.Types.RequiredReturnData>(c: Context, message: string, data: Data) {
        return c.json({ success: true, message, data }, 200);
    }

    static successNoData(c: Context, message: string) {
        return c.json({ success: true, message, data: null }, 200);
    }

    static created<Data extends APIResponse.Types.RequiredReturnData>(c: Context, message: string, data: Data) {
        return c.json({ success: true, message, data }, 201);
    }

    static serverError(c: Context, message: string) {
        return c.json({ success: false, message }, 500);
    }

    static unauthorized(c: Context, message: string) {
        return c.json({ success: false, message }, 401);
    }

    static badRequest(c: Context, message: string) {
        return c.json({ success: false, message }, 400);
    }

    static notFound(c: Context, message: string) {
        return c.json({ success: false, message }, 404);
    }

    static conflict(c: Context, message: string) {
        return c.json({ success: false, message }, 409);
    }

}

export namespace APIResponse.Utils {

    export function genericErrorSchema<Message extends string>(message: Message) {
        return z.object({
            success: z.literal(false),
            message: z.literal(message),
        }); 
    }

}

export namespace APIResponse.Schema {

    export function success<Message extends string, Data extends z.ZodType<APIResponse.Types.NonRequiredReturnData>>(message: Message, data: Data) {
        return z.object({
            success: z.literal(true),
            message: z.literal(message),
            data
        });
    }

    export function created<Message extends string, Data extends z.ZodType<APIResponse.Types.RequiredReturnData>>(message: Message, data: Data) {
        return z.object({
            success: z.literal(true),
            message: z.literal(message),
            data
        });
    }

    export const serverError = APIResponse.Utils.genericErrorSchema;
    export const unauthorized = APIResponse.Utils.genericErrorSchema;
    export const badRequest = APIResponse.Utils.genericErrorSchema;
    export const notFound = APIResponse.Utils.genericErrorSchema;
    export const conflict = APIResponse.Utils.genericErrorSchema;
}

export namespace APIResponse.Types {

    // Can be JSON object or Array
    export type RequiredReturnData = { [key: string]: any } | Array<any>;

    export type NonRequiredReturnData = null | RequiredReturnData;

    export type BasicResponseSchema =
        | z.infer<ReturnType<typeof APIResponse.Schema.success<any, z.ZodType<NonRequiredReturnData>>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.created<any, z.ZodType<RequiredReturnData>>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.serverError<any>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.unauthorized<any>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.badRequest<any>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.notFound<any>>>
        | z.infer<ReturnType<typeof APIResponse.Schema.conflict<any>>>;

}
