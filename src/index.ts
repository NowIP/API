import { DNSServer } from "./dns-server";
import { API } from "./api";
import { DB } from "./db";
import { ConfigHandler } from "./utils/config";
import { Logger } from "./utils/logger";

class Main {

    static async main() {

        const config = await ConfigHandler.loadConfig();

        Logger.setLogLevel(config.NOWIP_LOG_LEVEL ?? "info");

        await DB.init(
            config.NOWIP_DB_PATH ?? "./data/db.sqlite"
        );

        await API.start(
            parseInt(config.NOWIP_API_PORT ?? "3003"),
            config.NOWIP_API_HOST ?? "0.0.0.0"
        );

        await DNSServer.init({
            host: config.NOWIP_DNS_HOST ?? "0.0.0.0",
            port: parseInt(config.NOWIP_DNS_PORT ?? "53"),
            rootDomain: config.NOWIP_DNS_ROOT_DOMAIN,
            publicIPv4: config.NOWIP_DNS_PUBLIC_IPV4,
            publicIPv6: config.NOWIP_DNS_PUBLIC_IPV6
        });
        await DNSServer.start();

    }

}

Main.main();