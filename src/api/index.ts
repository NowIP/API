import { swaggerUI } from "@hono/swagger-ui";
import { swaggerEditor } from "@hono/swagger-editor";
import { Logger } from "../utils/logger";
import { authMiddleware } from "./middleware/auth";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { openAPIRouteHandler } from "hono-openapi";
import { setupDocs } from "./docs";

export class API {

	protected static server: Bun.Server<undefined>;
	protected static app: Hono;

	protected static routers = [
		(import('./routes/ddns2')),
		(import('./routes/auth')),
		(import('./routes/domains')),
	];

	static async init() {

		this.app = new Hono();

		this.app.use(prettyJSON())

		// Apply global auth middleware
		this.app.use(authMiddleware);

		for (const router of this.routers) {
			this.app.route("/", (await router).router);
		}

		setupDocs(this.app);

	}

	static async start(port: number, hostname: string) {

		if (!this.app) {
			await this.init();
		}

		this.server = Bun.serve({ port, hostname, fetch: this.app.fetch });

		Logger.log(`API is running at ${this.server?.hostname}:${this.server?.port}`);
	}

}