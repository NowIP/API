import { createMiddleware } from 'hono/factory'
import { APIRes } from "../utils/api-res";
import { SessionHandler } from '../utils/sessionHandler';

export const authMiddleware = createMiddleware(async (c, next) => {

    if (c.req.path.startsWith("/nic/update") || c.req.path.startsWith("/auth") || c.req.path.startsWith("/docs")) {
        await next();
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return APIRes.unauthorized(c, "Missing or invalid Authorization header");
    }

    const token = authHeader.substring("Bearer ".length);
    const session = await SessionHandler.getSession(token);

    if (!session || !(await SessionHandler.isValidSession(session))) {
        return APIRes.unauthorized(c, "Invalid or expired session");
    }

    c.set("session", session);

    await next();

});