import { BasicInMemoryDNSZoneStore, DNSRecords, DNSServer as Server,  } from 'better-dns';
import { Logger } from '../utils/logger';

interface DNSServerSettings {
    host: string;
    port: number;
    rootDomain: string;
    publicIPv4: string;
    publicIPv6?: string;
}

export class DNSServer {

    protected static server: Server<BasicInMemoryDNSZoneStore> | null = null;

    protected static settings: DNSServerSettings | null = null;

    static async init(settings: DNSServerSettings) {

        this.settings = settings;

        this.server = new Server({
            host: settings.host,
            port: settings.port,
            protocol: "both",
            dnsRecordStore: new BasicInMemoryDNSZoneStore({
                nsDomain: "ns." + settings.rootDomain,
                nsAdminEmail: "admin.ns." + settings.rootDomain
            })
        });

        
        const zone = await this.server.recordStore.createZone(settings.rootDomain);

        zone.setRecord(settings.rootDomain, DNSRecords.TYPE.A, {
            address: settings.publicIPv4,
        });
        zone.setRecord("ns." + settings.rootDomain, DNSRecords.TYPE.A, {
            address: settings.publicIPv4
        });

        if (settings.publicIPv6) {
            zone.setRecord(settings.rootDomain, DNSRecords.TYPE.AAAA, {
                address: settings.publicIPv6
            });
            zone.setRecord("ns." + settings.rootDomain, DNSRecords.TYPE.AAAA, {
                address: settings.publicIPv6
            });
        }

        await this.server.recordStore.updateZone(zone);

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
