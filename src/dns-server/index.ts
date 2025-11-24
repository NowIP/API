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

    protected static server: Server | null = null;

    protected static settings: DNSServerSettings | null = null;

    static async init(settings: DNSServerSettings) {

        this.settings = settings;

        const dnsRecordStore = new BasicInMemoryDNSZoneStore({
            nsDomain: "ns." + settings.rootDomain,
            nsAdminEmail: "admin.ns." + settings.rootDomain
        });

        dnsRecordStore.createZone(settings.rootDomain);

        this.server = new Server({
            ip: settings.host,
            port: settings.port,
            protocol: "both",
            dnsRecordStore
        });
    }

    static async start() {

        if (!this.settings) {
            throw new Error('DNS Server settings not set. Call DNSServer.init() first.');
        }
        if (!this.server) {
            throw new Error('DNS Server not initialized. Call DNSServer.init() first.');
        }

        await this.server.start();

        Logger.log(`DNS Server is running at ${this.settings.host}:${this.settings.port}`);
    }
}
