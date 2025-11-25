import { createMiddleware } from 'hono/factory'
import { APIRes } from "../utils/api-res";

export const authMiddleware = createMiddleware(async (c, next) => {

    if (c.req.path.startsWith("/nic/update") || c.req.path.startsWith("/auth")) {
        await next();
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return APIRes.unauthorized(c, "Missing or invalid Authorization header");
    }

    

    await next();

});