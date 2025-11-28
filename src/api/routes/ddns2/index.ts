import { DDNS2Model } from './model'
import { Hono } from 'hono';
import { Logger } from '../../../utils/logger';
import { describeRoute, validator as zValidator } from 'hono-openapi';
import { validator as honoValidator } from 'hono/validator';
import { DB } from '../../../db';
import { eq, and } from 'drizzle-orm';

export const router = new Hono();

router.get(
	'/nic/update',

	describeRoute({
		summary: "DDNSv2 Update",
		description: "Endpoint for updating domain IP addresses using the DDNSv2 protocol.",
		tags: ["DDNSv2"],

		security: [{
			ddnsv2BasicAuth: []
		}],

		responses: {
			200: {
				description: "IP address updated successfully",
				content: {
					"text/plain": {
						schema: {
							type: "string",
							example: "good 192.168.1.1"
						}
					}
				}
			},
			401: {
				description: "Authentication information is missing or invalid",
				content: {
					"text/plain": {
						schema: {
							type: "string",
							example: "badauth"
						}
					}
				}
			},
		},
	}),

	zValidator("query", DDNS2Model.Update.Query),
	honoValidator("header", (value, c) => {
		const result = DDNS2Model.Update.AuthHeader.safeParse(value);
		if (!result.success) {
			return c.text("badauth", 401);
		}
		return result.data;
	}),

	async (c) => {
		const basicAuthHeader = c.req.valid("header").authorization;

		const base64Credentials = basicAuthHeader.slice('Basic '.length);
		const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
		const [id, secret] = credentials.split(':');

		if (!id || !secret) {
			return c.text("badauth", 401);
		}

		const { hostname, myip } = c.req.valid("query");

		const hostnameSubdomain = hostname.split('.')[0];

		const domain = DB.instance().select().from(DB.Schema.domains).where(
			and(
				eq(DB.Schema.domains.id, parseInt(id, 10)),
				eq(DB.Schema.domains.ddnsv2_api_secret, secret),
				eq(DB.Schema.domains.subdomain, hostnameSubdomain)
			)
		).get();

		if (!domain) {
			return c.text("badauth", 401);
		}

		DB.instance().update(DB.Schema.domains).set({
			last_ipv4: myip.includes('.') ? myip : domain.last_ipv4,
			last_ipv6: myip.includes(':') ? myip : domain.last_ipv6
		}).where(eq(DB.Schema.domains.id, domain.id)).run();

		return c.text("good " + myip, 200);
	}
);