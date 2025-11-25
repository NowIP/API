import { Model } from './model'
import { Hono } from 'hono';
import { Logger } from '../../../utils/logger';
import { zValidator } from '@hono/zod-validator';
import { DB } from '../../../db';
import { eq, and } from 'drizzle-orm';

export const router = new Hono();

router.get(
	'/nic/update',
	zValidator("query", Model.Update.Query),
	zValidator("header", Model.Update.AuthHeader),
	async (c) => {
		const basicAuthHeader = c.req.valid("header").authorization;

		const base64Credentials = basicAuthHeader.slice('Basic '.length);
		const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
		const [id, secret] = credentials.split(':');

		if (!id || !secret) {
			return c.text("badauth");
		}

		const { hostname, myip } = c.req.valid("query");

		const domain = DB.instance().select().from(DB.Schema.domains).where(
			and(
				eq(DB.Schema.domains.id, parseInt(id, 10)),
				eq(DB.Schema.domains.ddnsv2_api_secret, secret),
				eq(DB.Schema.domains.subdomain, hostname)
			)
		).get();

		if (!domain) {
			return c.text("badauth");
		}

		DB.instance().update(DB.Schema.domains).set({
			last_ipv4: myip.includes('.') ? myip : domain.last_ipv4,
			last_ipv6: myip.includes(':') ? myip : domain.last_ipv6
		}).where(eq(DB.Schema.domains.id, domain.id)).run();

		return c.text("good " + myip);
	}
);