import { z } from "zod";

export namespace DDNS2Model.Update {

	export const QueryWithOneIP = z.object({
		hostname: z.hostname().min(1).max(253),
		myip: z.union([
			z.ipv4().meta({ title: "IPv4 Address" }),
			z.ipv6().meta({ title: "IPv6 Address" })
		])
	});
	export type QueryWithOneIP = z.infer<typeof QueryWithOneIP>;

	export const QueryWithBothIPs = z.object({
		hostname: z.hostname().min(1).max(253),
		myipv4: z.ipv4().meta({ title: "IPv4 Address" }),
		myipv6: z.ipv6().meta({ title: "IPv6 Address" })
	});
	export type QueryWithBothIPs = z.infer<typeof QueryWithBothIPs>;


	export const Query = z.union([
		QueryWithOneIP,
		QueryWithBothIPs
	]);
	
	export type Query = z.infer<typeof Query>;

	export const AuthHeader = z.object({
		authorization: z.string().startsWith('Basic ')
	});

	export type AuthHeader = z.infer<typeof AuthHeader>;
}