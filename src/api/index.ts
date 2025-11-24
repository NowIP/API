import { Elysia } from "elysia";

import { ddns2 } from "./ddns2";
import { Logger } from "../utils/logger";

export class API {

	static async start(port: number, hostname: string) {
		
		let app = new Elysia()
			.use(ddns2);

		if (hostname === "::" || hostname === "0.0.0.0") {
			app = app.listen({ port, hostname: "0.0.0.0" }).listen({ port, hostname: "::" });
		} else {
			app = app.listen({ port, hostname });
		}

		Logger.log(`API is running at ${app.server?.hostname}:${app.server?.port}`);
	}

}