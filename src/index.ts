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

        await API.init(
            config.NOWIP_FRONTEND_URL ?? "http://localhost:3000"
        );

        await API.start(
            parseInt(config.NOWIP_API_PORT ?? "3003"),
            config.NOWIP_API_HOST ?? "::"
        );

        await DNSServer.init({
            host: config.NOWIP_DNS_HOST ?? "::",
            port: parseInt(config.NOWIP_DNS_PORT ?? "53"),
            baseDomain: config.NOWIP_DNS_DOMAIN,
            nsPrimaryDomain: config.NOWIP_DNS_NS_PRIMARY,
            nsSecondaryDomain: config.NOWIP_DNS_NS_SECONDARY,
            customRecordsFile: config.NOWIP_DNS_CUSTOM_RECORDS_FILE,
            slaveServers: config.NOWIP_DNS_SLAVE_SERVERS ? config.NOWIP_DNS_SLAVE_SERVERS.split(",") : [],
            allowedUpdateIPSubnets: config.NOWIP_DNS_ALLOWED_UPDATE_IP_SUBNETS ? config.NOWIP_DNS_ALLOWED_UPDATE_IP_SUBNETS.split(",") : []
        });

        await DNSServer.start();

    }

}

Main.main();