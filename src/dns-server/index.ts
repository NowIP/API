import { DNSServer as Server } from 'better-dns';
import { Logger } from '../utils/logger';
import { DNSHybridRecordStore, DNSHybridRecordStoreSettings } from './recordStore';

interface DNSServerSettings extends DNSHybridRecordStoreSettings {
    host: string;
    port: number;
}

export class DNSServer {

    protected static server: Server<DNSHybridRecordStore> | null = null;

    protected static settings: DNSServerSettings | null = null;

    static async init(settings: DNSServerSettings) {

        this.settings = settings;

        this.server = new Server({
            host: settings.host,
            port: settings.port,
            protocol: "both",
            dnsRecordStore: new DNSHybridRecordStore(settings)
        });

        await this.server.recordStore.loadCustomRecordsFromFile();
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
