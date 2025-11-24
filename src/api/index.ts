import { Elysia } from "elysia";

import { ddns2 } from "./ddns2";
import { Logger } from "../utils/logger";

export class API {

	static async start(port: number, hostname = "0.0.0.0") {

		const app = new Elysia()
			.use(ddns2)
			.listen({
				port,
				hostname
			});

		Logger.log(`API is running at ${app.server?.hostname}:${app.server?.port}`);
	}

}