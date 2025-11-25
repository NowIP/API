import { Context } from "hono";

export class APIRes {

    static success<Data>(c: Context, message: string, data: Data) {
        return c.json({ status: "OK", message, data }, 200);
    }

    static error(c: Context, message: string) {
        return c.json({ status: "ERROR", message }, 500);
    }

    static unauthorized(c: Context, message: string) {
        return c.json({ status: "ERROR", message }, 401);
    }

    static badRequest(c: Context, message: string) {
        return c.json({ status: "ERROR", message }, 400);
    }

    static notFound(c: Context, message: string) {
        return c.json({ status: "ERROR", message }, 404);
    }

}
