import { DDNS2Model } from './model'
import { Hono } from 'hono';
import { Logger } from '../../../utils/logger';
import { describeRoute, validator as zValidator } from 'hono-openapi';
import { validator as honoValidator } from 'hono/validator';
import { DB } from '../../../db';
import { eq, and } from 'drizzle-orm';
import { APIRouteSpec } from '../../utils/specHelpers';
import { DNSRecordStoreUtils } from '../../../dns-server/recordStore';

export const router = new Hono();

router.get(
	'/nic/update',

	APIRouteSpec.custom({
		summary: "DDNSv2 Update",
		description: "Endpoint for updating domain IP addresses using the DDNSv2 protocol.",
		tags: ["DDNSv2"],

		security: [{
			basicAuth: []
		}],

		responses: {
			200: {
				description: "IP address updated successfully",
				content: {
					"text/plain": {
						schema: {
							type: "string",
							example: "good 1.2.3.4"
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
			400: {
				description: "Bad request due to missing or invalid parameters",
				content: {
					"text/plain": {
						schema: {
							type: "string",
							example: "badrequest"
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

		const body = c.req.valid("query");

		const dataWithOneIP = DDNS2Model.Update.QueryWithOneIP.safeParse(body);
		const dataWithBothIPs = DDNS2Model.Update.QueryWithBothIPs.safeParse(body);

		const hostname: string = body.hostname;
		let myipv4: string | null = null;
		let myipv6: string | null = null;

		if (dataWithOneIP.success) {
			
			if (dataWithOneIP.data.myip.includes('.')) {

				myipv4 = dataWithOneIP.data.myip;

			} else if (dataWithOneIP.data.myip.includes(':')) {

				myipv6 = dataWithOneIP.data.myip;

			} else {
				throw new Error("Invalid IP address format");
			}

		} else if (dataWithBothIPs.success) {
			
			myipv4 = dataWithBothIPs.data.myipv4;
			myipv6 = dataWithBothIPs.data.myipv6;

		} else {
			throw new Error("Invalid query parameters");
		}

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
			last_ipv4: myipv4 ? myipv4 : domain.last_ipv4,
			last_ipv6: myipv6 ? myipv6 : domain.last_ipv6,
			last_ddns_update: Math.floor(Date.now() / 1000) // current timestamp in seconds
		}).where(eq(DB.Schema.domains.id, domain.id)).run();

		await DNSRecordStoreUtils.updateSoaSerial();

		let returnMessage = "good ";
		if (dataWithOneIP.success) {
			returnMessage += myipv4 || myipv6;
		} else if (dataWithBothIPs.success) {
			returnMessage += `${myipv4}, ${myipv6}`;
		} else {
			throw new Error("Invalid query parameters");
		}

		return c.text(returnMessage, 200);
	}
);