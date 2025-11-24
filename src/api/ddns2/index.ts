import { Elysia } from 'elysia'

import { DDNS2Service } from './service'
import { DDNS2Model } from './model'

export const ddns2 = new Elysia()

	.get('/nic/update',
		async ({ query, headers }) => {
            
            const base64Credentials = headers.authorization.slice('Basic '.length);
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [username, password] = credentials.split(':');

            return await DDNS2Service.update(username, password, query);
            
		}, {
            query: DDNS2Model.Update.Query,
            headers: DDNS2Model.Update.AuthHeader
		}
	)