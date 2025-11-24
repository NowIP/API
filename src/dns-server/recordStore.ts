import { AbstractDNSRecordStore, DNSRecords, DNSZone } from "better-dns";
import { DB } from "../db";
import { TableSchema } from "../db/schema";
import { eq } from "drizzle-orm";

export class DNSHybridRecordStore extends AbstractDNSRecordStore {

    protected readonly baseZone: DNSZone;

    constructor(
        protected readonly settings: {
            readonly baseDomain: string;
            readonly publicIPv4: string;
            readonly publicIPv6?: string;
        }
    ) {
        super();
        
        this.baseZone = DNSZone.create(this.settings.baseDomain, {
            nsDomain: "ns." + this.settings.baseDomain,
            nsAdminEmail: "admin.ns." + this.settings.baseDomain
        });

        this.baseZone.setRecord(this.settings.baseDomain, DNSRecords.TYPE.A, {
            address: this.settings.publicIPv4,
        });
        this.baseZone.setRecord("ns." + this.settings.baseDomain, DNSRecords.TYPE.A, {
            address: this.settings.publicIPv4
        });

        if (this.settings.publicIPv6) {
            this.baseZone.setRecord(this.settings.baseDomain, DNSRecords.TYPE.AAAA, {
                address: this.settings.publicIPv6
            });
            this.baseZone.setRecord("ns." + this.settings.baseDomain, DNSRecords.TYPE.AAAA, {
                address: this.settings.publicIPv6
            });
        }

    }

    async updateSerial(): Promise<void> {

        const soa = this.baseZone.getRecords(this.settings.baseDomain, DNSRecords.TYPE.SOA)[0];
        const newSerial = DNSZone.Util.nextSoaSerial(soa.serial);
        soa.serial = newSerial;
        this.baseZone.setRecord(this.settings.baseDomain, DNSRecords.TYPE.SOA, soa);

        const serial = (await DB.instance().update(TableSchema.systemConfigs)
            .set({
                value: newSerial.toString()
            })
            .where(eq(TableSchema.systemConfigs.key, 'dns_serial'))
            .returning()
        )[0]?.value;

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

        console.log(subdomain);

        const result = (await DB.instance().select()
            .from(TableSchema.domains)
            .where(eq(TableSchema.domains.subdomain, subdomain)).limit(1))[0];
    
        if (!result) {
            return [];
        }
        
        if (type === DNSRecords.TYPE.A && result.lastIPv4) {
            return [{
                address: result.lastIPv4,
                ttl: 300
            } satisfies DNSRecords.A as DNSRecords.A];
        }

        if (type === DNSRecords.TYPE.AAAA && result.lastIPv6) {
            return [{
                address: result.lastIPv6,
                ttl: 300
            } satisfies DNSRecords.AAAA as DNSRecords.AAAA];
        }

        return [];
    }

}
