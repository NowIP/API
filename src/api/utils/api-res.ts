import { Context } from "hono";

// Can be JSON object or Array
type RequiredReturnData = { [key: string]: any } | Array<any>;

type NonRequiredReturnData = null | RequiredReturnData;

export class APIResponse {

    static success<Data extends NonRequiredReturnData>(c: Context, message: string, data: Data) {
        return c.json({ success: true, message, data });
    }

    static created<Data extends RequiredReturnData>(c: Context, message: string, data: Data) {
        return c.json({ success: true, message, data }, 201);
    }

    static error(c: Context, message: string) {
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
