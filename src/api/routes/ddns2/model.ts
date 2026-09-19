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

	export const QueryWithBothIPsInOneQuery = z.object({
		hostname: z.hostname().min(1).max(253),
		myip: z.string().transform((value, ctx) => {

			const [myip1, myip2] = value.split(',');
			if (!myip1 || !myip2) {
				return z.NEVER;
			}
			console.log("Parsing IP addresses:", myip1, myip2);
			if (myip1.includes('.') && myip2.includes(':')) {

				const ipv4 = z.ipv4().safeParse(myip1).data;
				const ipv6 = z.ipv6().safeParse(myip2).data;
				
				if (!ipv4 || !ipv6) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Invalid IP address format"
					});
					return z.NEVER;
				}

				return { ipv4, ipv6 };

			} else if (myip1.includes(':') && myip2.includes('.')) {
				
				const ipv6 = z.ipv6().safeParse(myip1).data;
				const ipv4 = z.ipv4().safeParse(myip2).data;

				if (!ipv4 || !ipv6) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Invalid IP address format"
					});
					return z.NEVER;
				}

				return { ipv4, ipv6 };

			} else {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Invalid IP address format"
				});
				return z.NEVER;
			}

		})
	});
	export type QueryWithBothIPsInOneQuery = z.infer<typeof QueryWithBothIPsInOneQuery>;

	export const QueryWithBothIPs = z.object({
		hostname: z.hostname().min(1).max(253),
		myipv4: z.ipv4().meta({ title: "IPv4 Address" }),
		myipv6: z.ipv6().meta({ title: "IPv6 Address" })
	});
	export type QueryWithBothIPs = z.infer<typeof QueryWithBothIPs>;


	export const Query = z.union([
		QueryWithOneIP,
		QueryWithBothIPs,
		QueryWithBothIPsInOneQuery
	]);
	
	export type Query = z.infer<typeof Query>;

	export const AuthHeader = z.object({
		authorization: z.string().startsWith('Basic ')
	});

	export type AuthHeader = z.infer<typeof AuthHeader>;
}