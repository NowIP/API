import { z } from "zod";

export namespace Model.Update {

	export const Query = z.object({
		hostname: z.hostname(),
		myip: z.ipv4().or(z.ipv6()),
		// myipv6: z.ipv6().optional()
	});
	export type Query = z.infer<typeof Query>;

	export const AuthHeader = z.object({
		authorization: z.string().startsWith('Basic ')
	});

	export type AuthHeader = z.infer<typeof AuthHeader>;
}