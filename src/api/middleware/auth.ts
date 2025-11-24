import { Elysia } from "elysia";

export const authMiddleware = new Elysia({ name: 'auth-middleware' })

    .macro