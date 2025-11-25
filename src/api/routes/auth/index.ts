import { Elysia } from "elysia";

import { AuthService } from './service'
import { AuthModel } from './model'

export const auth = new Elysia({ prefix: '/auth' })
    .get('/login', async ({ body }) => {

    }, {
        body: AuthModel.Login.Body,
    }); 