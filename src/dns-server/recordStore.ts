import { AbstractDNSRecordStore, DNSRecords, DNSZone } from "better-dns";
import { DB } from "../db";
import { eq } from "drizzle-orm";
import { RecordDataSchemas } from "./utils";

export interface DNSHybridRecordStoreSettings {
    readonly baseDomain: string;
    readonly nsPrimaryDomain: string;
    readonly nsSecondaryDomain?: string;
    readonly customRecordsFile?: string;
}

export class DNSHybridRecordStore extends AbstractDNSRecordStore {

    protected readonly baseZone: DNSZone;

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

                        const parsedRecordData = RecordDataSchemas[typeStr as keyof typeof RecordDataSchemas]?.safeParse(recordData);

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

    }

    async getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSRecords.RecordData[]> {

        if (name === this.settings.baseDomain || name === "ns." + this.settings.baseDomain) {
            return this.baseZone.getRecords(name, type);
        }

        if (type !== DNSRecords.TYPE.A && type !== DNSRecords.TYPE.AAAA) {
            return [];
        }

        const subdomain = name.endsWith("." + this.settings.baseDomain)
            ? name.slice(0, name.length - this.settings.baseDomain.length - 1)
            : name;

        if (!subdomain || subdomain.includes('.')) {
            return [];
        }

        const result = (await DB.instance().select()
            .from(DB.Schema.domains)
            .where(eq(DB.Schema.domains.subdomain, subdomain)).limit(1))[0];

        if (!result) {
            return [];
        }

        if (type === DNSRecords.TYPE.A && result.last_ipv4) {
            return [{
                address: result.last_ipv4,
                ttl: 300
            } satisfies DNSRecords.A as DNSRecords.A];
        }

        if (type === DNSRecords.TYPE.AAAA && result.last_ipv6) {
            return [{
                address: result.last_ipv6,
                ttl: 300
            } satisfies DNSRecords.AAAA as DNSRecords.AAAA];
        }

        return [];
    }

}
