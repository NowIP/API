import { Model } from './model'
import { Hono } from 'hono';
import { Logger } from '../../../utils/logger';
import { zValidator } from '@hono/zod-validator';

export const router = new Hono();

router.get(
	'/nic/update',
	zValidator("query", Model.Update.Query),
	zValidator("header", Model.Update.AuthHeader),
	async (c) => {
		const basicAuthHeader = c.req.valid("header").authorization;

		const base64Credentials = basicAuthHeader.slice('Basic '.length);
		const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
		const [username, password] = credentials.split(':');

		if (!username || !password) {
			return c.text("badauth");
		}

		const { hostname, myip } = c.req.valid("query");

		Logger.log(`Received update request for hostname: ${hostname} with IP: ${myip} from user: ${username} with password: ${password}`);

		return c.text("good " + myip);

	}
);