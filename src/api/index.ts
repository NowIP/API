import { Elysia } from "elysia";

import { ddns2 } from "./modules/ddns2";
import { Logger } from "../utils/logger";
import openapi, { fromTypes } from "@elysiajs/openapi";
import z from "zod";
import { authMiddleware } from "./middleware/auth";

const routes = {
    ddns2: (await import('./modules/ddns2')).ddns2,
    auth: await import('./modules/auth'),
}



export class API {

	static async start(port: number, hostname: string) {
		
		let app = new Elysia()
			.use(openapi({
				mapJsonSchema: {
					zod: z.toJSONSchema
				}
			}))
			.use(authMiddleware)
			.use(routes.ddns2);	

		if (hostname === "::" || hostname === "0.0.0.0") {
			app = app.listen({ port, hostname: "0.0.0.0" }).listen({ port, hostname: "::" });
		} else {
			app = app.listen({ port, hostname });
		}

		Logger.log(`API is running at ${app.server?.hostname}:${app.server?.port}`);
	}

}