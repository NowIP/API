
import { DDNS2Service } from './service'
import { DDNS2Model } from './model'
import { Hono } from 'hono';
import { Logger } from '../../../utils/logger';

export const ddnsv2api = new Hono();

ddnsv2api.get('/nic/update', async (c) => {

      const basicAuthHeader = c.req.header("Authorization");

      if (!basicAuthHeader || !basicAuthHeader.startsWith('Basic ')) {
          return c.json({ status: "ERROR", message: "Unauthorized" }, 401);
      }

      const base64Credentials = basicAuthHeader.slice('Basic '.length);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (!username || !password) {
            return c.json({ status: "ERROR", message: "Unauthorized" }, 401);
            return "badauth";
        }

        Logger.log(`Received update request for hostname: ${hostname} with IP: ${myip} from user: ${username} with password: ${password}`);

        return "good " + myip;

}, {
      query: DDNS2Model.Update.Query,
      headers: DDNS2Model.Update.AuthHeader
});