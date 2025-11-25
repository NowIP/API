
import { ddns2 } from "./routes/ddns2";
import { Logger } from "../utils/logger";
import z from "zod";
import { authMiddleware } from "./middleware/auth";
import { Hono } from "hono";

const routes = {
    ddns2: (await import('./routes/ddns2')).ddns2,
    auth: await import('./routes/auth'),
}



export class API {

	static async start(port: number, hostname: string) {
		
		const app = new Hono()
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