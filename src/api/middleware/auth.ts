import { createMiddleware } from 'hono/factory'
import { APIRes } from "../utils/api-res";
import { SessionHandler } from '../utils/sessionHandler';

export const authMiddleware = createMiddleware(async (c, next) => {

    if (c.req.path.startsWith("/nic/update") || c.req.path.startsWith("/auth")) {
        await next();
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return APIRes.unauthorized(c, "Missing or invalid Authorization header");
    }

    if (!await SessionHandler.isValidSession(authHeader.substring("Bearer ".length))) {
        return APIRes.unauthorized(c, "Invalid or expired session");
    }

    await next();

});