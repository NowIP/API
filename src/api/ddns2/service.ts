import { Logger } from "../../utils/logger";
import { DDNS2Model } from "./model";

export class DDNS2Service {

    static async update(username: string | undefined, password: string | undefined, { hostname, myip }: DDNS2Model.Update.Query) {

        if (!username || !password) {
            Logger.warn('Authentication failed: Missing username or password');
            return "badauth";
        }

        Logger.log(`Received update request for hostname: ${hostname} with IP: ${myip} from user: ${username} with password: ${password}`);

        return "good " + myip;
    }

}
