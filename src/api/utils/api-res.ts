import { Context } from "hono";

export class APIRes {

    static success<Data>(c: Context, message: string, data: Data) {
        return c.json({ success: true, message, data });
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

}
