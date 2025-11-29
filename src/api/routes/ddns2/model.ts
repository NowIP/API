import { z } from "zod";

export namespace DDNS2Model.Update {

	export const Query = z.object({
		hostname: z.hostname().min(1).max(253),
		myip: z.union([
			z.ipv4().meta({ title: "IPv4 Address" }),
			z.ipv6().meta({ title: "IPv6 Address" })
		]),
		// myipv6: z.ipv6().optional()
	});
	export type Query = z.infer<typeof Query>;

	export const AuthHeader = z.object({
		authorization: z.string().startsWith('Basic ')
	});

	export type AuthHeader = z.infer<typeof AuthHeader>;
}