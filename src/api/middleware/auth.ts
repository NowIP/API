import { Hono } from "hono";
import { APIRes } from "../utils/api-res";

export const authMiddleware = new Hono().use(async (c, next) => {

    if (c.req.path.startsWith("/nic/update") || c.req.path.startsWith("/auth")) {
        await next();
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return APIRes.unauthorized(c, "Missing or invalid Authorization header");
    }

    await next();

})