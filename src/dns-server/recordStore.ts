import { AbstractDNSRecordStore, DNSRecords } from "better-dns";

export class DNSHybridRecordStore extends AbstractDNSRecordStore {

    constructor(
        protected readonly baseDomain: string
    ) {
        super();
    }

    async getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSRecords.RecordData[]> {
        


    }

}
