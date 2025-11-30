import { AbstractDNSRecordStore, DNSQuery, DNSRecords, DNSZone } from "better-dns";
import { DB } from "../db";
import { eq, and } from "drizzle-orm";
import { DNSRecordDataSchemas } from "./utils";
import { Utils } from "../utils";

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

        returnData.authorities.push({
            name: baseDomain,
            type: DNSRecords.TYPE.SOA,
            ...this.baseZone.records.get(baseDomain)?.get(DNSRecords.TYPE.SOA)?.[0] as DNSRecords.SOA,
        });

        returnData.authorities.push(...this.baseZone.records.get(baseDomain)?.get(DNSRecords.TYPE.NS)?.map(nsRecord => ({
            name: baseDomain,
            type: DNSRecords.TYPE.NS,
            ...nsRecord
        })) || []);

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

        console.log(`Looking for additional DNS records for domain ${apexSubdomain}, subdomain ${subSubdomain}, type ${recordTypeStr}`);

        const additionalRecords = await DB.instance().select()
            .from(DB.Schema.additionalDnsRecords)
            .where(and(
                eq(DB.Schema.additionalDnsRecords.subdomain, subSubdomain),
                eq(DB.Schema.additionalDnsRecords.type, recordTypeStr as any)
            ));

        if (additionalRecords.length > 0) {
            returnData.answers.push(...additionalRecords.map(rec => rec.record_data));
        }

        return returnData;
    }

}
