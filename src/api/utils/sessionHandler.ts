import { DB } from "../../db";
import crypto from "crypto";

export class SessionHandler {

    static async createSession(userID: number) {
        const result = await DB.instance().insert(DB.Schema.sessions).values({
            user_id: userID,
            session_token: crypto.randomBytes(32).toString('hex'),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime() // 7 days from now
        }).returning()
        
        const sessionID = result[0].id;
        const sessionToken = result[0].session_token;

        return { sessionToken };
    }

    static async validateSession(sessionToken: string) {
        const session = await DB.instance().select().from(DB.Schema.sessions).where(DB.Schema.sessions.id.eq(sessionID)).and(DB.Schema.sessions.session_token.eq(sessionToken)).and(DB.Schema.sessions.expires_at.gt(Date.now())).get();

    static async inValidateAllSessionsForUser(userID: number) {

    }

    static async inValidateSession(sessionID: number) {

    }

}