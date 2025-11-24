import { BasicInMemoryDNSZoneStore, DNSServer as Server,  } from 'better-dns';
import { Logger } from '../utils/logger';

interface DNSServerSettings {
    host: string;
    port: number;
    rootDomain: string;
    publicIPv4: string;
    publicIPv6?: string;
}

export class DNSServer {

    protected static server: Server;

    protected static settings: DNSServerSettings;

    static async init(settings: DNSServerSettings) {

        const dnsRecordStore = new BasicInMemoryDNSZoneStore({
            nsDomain: "ns." + settings.rootDomain,
            nsAdminEmail: "admin.ns." + settings.rootDomain
        });

        this.server = new Server({
            ip: settings.host,
            port: settings.port,
            protocol: "both",
            dnsRecordStore
        });
    }

    static async start() {
        await this.server.start();

        Logger.log(`DNS Server is running at ${this.server.ip}:${this.server.port}`);
    }
}
