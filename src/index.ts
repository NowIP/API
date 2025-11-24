import { Elysia } from "elysia";

import { ddns2 } from "./api/ddns2";
import { Logger } from "./utils/logger";

const app = new Elysia()
	.use(ddns2)
	.listen(3003);

Logger.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

