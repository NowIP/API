import { AbstractDNSRecordStore, DNSQuery, DNSRecords, DNSZone } from "better-dns";
import { DB } from "../db";
import { eq, and } from "drizzle-orm";
import { DNSRecordDataSchemas } from "./utils";
import { Utils } from "../utils";
import { Logger } from "../utils/logger";

export interface DNSHybridRecordStoreSettings {
    readonly baseDomain: string;
    readonly nsPrimaryDomain: string;
    readonly nsSecondaryDomain?: string;
    readonly customRecordsFile?: string;
    readonly slaveServers?: string[];
    readonly allowedUpdateIPSubnets?: string[];
}

export class DNSHybridRecordStore extends AbstractDNSRecordStore {

    // protected readonly baseZone: DNSZone;

    protected get baseZone(): DNSZone {
        return DNSRecordStoreUtils.getBaseDNSZone();
    }
    protected set baseZone(value: DNSZone) {
        DNSRecordStoreUtils.setBaseDNSZone(value);
    }

    constructor(
        protected readonly settings: DNSHybridRecordStoreSettings
    ) {
        super();

        this.baseZone = DNSZone.create(this.settings.baseDomain, {
            nsDomain: this.settings.nsPrimaryDomain,
            nsAdminEmail: "admin." + this.settings.nsPrimaryDomain
        });

        if (this.settings.nsSecondaryDomain) {
            this.baseZone.setRecord(this.settings.baseDomain, DNSRecords.TYPE.NS, {
                host: this.settings.nsSecondaryDomain
            });
        }

        if (this.settings.slaveServers) {
            const slaveSettings = this.baseZone.createSlaveSettings(this.settings.slaveServers.map(server => {

                const [ host, portStr ] = server.split(":");
                const port = portStr ? parseInt(portStr) : -1;
                if (isNaN(port) || port <= 0 || port > 65535) {
                    throw new Error(`Invalid port number in slave server address: ${server}`);
                }
                return {
                    address: host,
                    port
                };
            }));

            if (this.settings.allowedUpdateIPSubnets) {
                for (const subnet of this.settings.allowedUpdateIPSubnets) {
                    slaveSettings.addAllowedTransferIP(subnet);
                }
            }
        }

    }

    async loadCustomRecordsFromFile() {
        if (!this.settings.customRecordsFile) return;
        
        try {
            const fileJson = await Bun.file(this.settings.customRecordsFile).json();
            
            if (typeof fileJson !== 'object' || fileJson === null) {
                throw new Error('Custom records file does not contain a valid JSON object');
            }

            for (const [name, records] of Object.entries(fileJson as Record<string, any>)) {
                const subdomain = name === "@" ? this.settings.baseDomain : name + "." + this.settings.baseDomain;

                if (!records || typeof records !== 'object') {
                    throw new Error(`Invalid records for ${name} in custom records file`);
                }

                for (const [typeStr, recs] of Object.entries(records)) {
                    if (!Array.isArray(recs)) {
                        throw new Error(`Records for type ${typeStr} under ${name} must be an array`);
                    }
                    for (const recordData of recs as DNSRecords.RecordData[]) {

                        if (!(typeStr in DNSRecords.TYPE)) {
                            throw new Error(`Unsupported record type ${typeStr} under ${name}`);
                        }

                        const recordType = typeStr as keyof typeof DNSRecords.TYPE;

                        if (recordType === "SOA" || recordType === "NS" || recordType === "PTR") {
                            throw new Error(`Record type ${typeStr} under ${name} is not supported in custom records`);
                        }

                        const parsedRecordData = DNSRecordDataSchemas[typeStr as keyof typeof DNSRecordDataSchemas]?.safeParse(recordData);

                        if (!parsedRecordData?.success) {
                            throw new Error(`Invalid record data for type ${typeStr} under ${name}: ${parsedRecordData?.error}`);
                        }

                        this.baseZone.setRecord(
                            subdomain,
                            DNSRecords.TYPE[typeStr as keyof typeof DNSRecords.TYPE],
                            parsedRecordData.data
                        );
                    }
                }
            }

        } catch (err) {
            throw new Error(`Failed to load custom DNS records from file: ${err}`);
        }

        await DNSRecordStoreUtils.initSoaSerial();

    }

    async getAuthority(name: string): Promise<DNSRecords.ResponseWithoutClass[]> {

        const authorities: DNSRecords.ResponseWithoutClass[] = [];

        const baseDomain = this.settings.baseDomain;

        if (!name.endsWith(baseDomain)) {
            return [];
        }

        authorities.push({
            name: baseDomain,
            type: DNSRecords.TYPE.SOA,
            ...this.baseZone.records.get(baseDomain)?.get(DNSRecords.TYPE.SOA)?.[0] as DNSRecords.SOA,
        });

        authorities.push(...this.baseZone.records.get(baseDomain)?.get(DNSRecords.TYPE.NS)?.map(nsRecord => ({
            name: baseDomain,
            type: DNSRecords.TYPE.NS,
            ...nsRecord
        })) || []);

        return authorities;
    }

    async getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSQuery.Response> {

        const returnData: DNSQuery.Response = {
            answers: [],
            authorities: [],
            additionals: []
        }

        const baseDomain = this.settings.baseDomain;

        if (!name.endsWith(baseDomain)) {
            return returnData;
        }

        const baseDomainRecordData = this.baseZone.getRecords(name, type);
        if (baseDomainRecordData.length > 0) {
            returnData.answers.push(...baseDomainRecordData);
            return returnData;
        }

        const fullSubdomain = name.slice(0, name.length - this.settings.baseDomain.length - 1);

        let [ apexSubdomain, subSubdomain ] = Utils.splitNTimesReverse(fullSubdomain, '.', 1).reverse() as [string | undefined, string | undefined];
        
        if (!apexSubdomain) {
            return returnData;
        }

        const apexDomain = (await DB.instance().select()
            .from(DB.Schema.domains)
            .where(eq(DB.Schema.domains.subdomain, apexSubdomain)).limit(1))[0];

        if (!apexDomain) {
            return returnData;
        }

        if (!subSubdomain && (type === DNSRecords.TYPE.A || type === DNSRecords.TYPE.AAAA)) {

            if (type === DNSRecords.TYPE.A && apexDomain.last_ipv4) {
                returnData.answers.push({
                    address: apexDomain.last_ipv4,
                    ttl: 300
                } satisfies DNSRecords.A as DNSRecords.A);

                return returnData;
            }

            if (type === DNSRecords.TYPE.AAAA && apexDomain.last_ipv6) {
                returnData.answers.push({
                    address: apexDomain.last_ipv6,
                    ttl: 300
                } satisfies DNSRecords.AAAA as DNSRecords.AAAA);

                return returnData;
            }

            return returnData;
        }

        if (!subSubdomain) {
            subSubdomain = "@";
        }

        const recordTypeStr = Object.keys(DNSRecords.TYPE).find(key => DNSRecords.TYPE[key as keyof typeof DNSRecords.TYPE] === type);

        const additionalRecords = await DB.instance().select()
            .from(DB.Schema.additionalDnsRecords)
            .where(and(
                eq(DB.Schema.additionalDnsRecords.subdomain, subSubdomain),
                eq(DB.Schema.additionalDnsRecords.type, recordTypeStr as any)
            ));

        if (additionalRecords.length > 0) {
            returnData.answers.push(...additionalRecords.map(rec => {
                const data = rec.record_data;
                if (data.ttl === undefined || data.ttl === null) {
                    data.ttl = 300;
                }
                return data;
            }));
        }

        return returnData;
    }

    async getAllRecordsForZone(zoneName: string) {
        const records: DNSRecords.ResponseWithoutClass[] = [];

        if (zoneName !== this.settings.baseDomain) {
            return records;
        }

        for (const [name, typeMap] of this.baseZone.records) {
            for (const [type, recs] of typeMap) {
                for (const recordData of recs) {
                    records.push({
                        name: name,
                        type: type,
                        ...recordData
                    });
                }
            }
        }

        const domains = await DB.instance().select()
            .from(DB.Schema.domains);

        for (const domain of domains) {
            const subdomain = domain.subdomain;
            if (domain.last_ipv4) {
                records.push({
                    name: `${subdomain}.${this.settings.baseDomain}`,
                    type: DNSRecords.TYPE.A,
                    address: domain.last_ipv4,
                    ttl: 300
                } as (DNSRecords.A & DNSRecords.ResponseWithoutClass));
            }
            if (domain.last_ipv6) {
                records.push({
                    name: `${subdomain}.${this.settings.baseDomain}`,
                    type: DNSRecords.TYPE.AAAA,
                    address: domain.last_ipv6,
                    ttl: 300
                } as (DNSRecords.AAAA & DNSRecords.ResponseWithoutClass));
            }
            const additionalRecords = await DB.instance().select()
                .from(DB.Schema.additionalDnsRecords)
                .where(eq(DB.Schema.additionalDnsRecords.domain_id, domain.id));

            for (const rec of additionalRecords) {
                records.push({
                    name: rec.subdomain === "@" ? `${subdomain}.${this.settings.baseDomain}` : `${rec.subdomain}.${subdomain}.${this.settings.baseDomain}`,
                    type: DNSRecords.TYPE[rec.type],
                    ...rec.record_data
                });
            }
        }

        return records;
    }

    async getSlaveSettings(zoneName: string) {
        if (zoneName !== this.settings.baseDomain) {
            return null;
        }

        return this.baseZone.getSlaveSettings();
    }

}

export class DNSRecordStoreUtils {

    private static soaSerialcache: number;

    private static baseDNSZone: DNSZone;

    static setBaseDNSZone(zone: DNSZone) {
        this.baseDNSZone = zone;
    }
    static getBaseDNSZone(): DNSZone {
        return this.baseDNSZone;
    }

    static getSoaSerial() {
        return this.soaSerialcache;
    }

    static async initSoaSerial() {
        const row = (await DB.instance().select()
            .from(DB.Schema.metadata)
            .where(eq(DB.Schema.metadata.key, 'dns_soa_serial'))
            .limit(1))[0];
        if (row) {
            this.soaSerialcache = parseInt(row.value);
        } else {
            this.soaSerialcache = DNSZone.Util.nextSoaSerial();
            await DB.instance().insert(DB.Schema.metadata).values({
                key: 'dns_soa_serial',
                value: this.soaSerialcache.toString()
            });
        }
        await this.pushUpdates();
    }

    static async updateSoaSerial() {
        this.soaSerialcache = DNSZone.Util.nextSoaSerial(this.soaSerialcache);
        await DB.instance().update(DB.Schema.metadata).set({
            key: 'dns_soa_serial',
            value: DNSZone.Util.nextSoaSerial(this.soaSerialcache).toString()
        });
        await this.pushUpdates();
    }

    private static async pushUpdates() {
        const baseDomain = DNSRecordStoreUtils.getBaseDNSZone();

        const existingSerial = baseDomain.getRecords(baseDomain.name, DNSRecords.TYPE.SOA)[0].serial;
        const newSerial = DNSRecordStoreUtils.getSoaSerial();

        if (existingSerial !== newSerial) {
            baseDomain.getRecords(baseDomain.name, DNSRecords.TYPE.SOA)[0].serial = newSerial;

            Logger.debug(`Updated SOA serial to ${newSerial} in DNS record store and pushing NOTIFY to slaves.`);
            const result = await baseDomain.getSlaveSettings()?.sendNOTIFY();
            if (!result) {
                Logger.debug(`ERROR: NOTIFY was not successful.`);
            }
        }
    }

}
