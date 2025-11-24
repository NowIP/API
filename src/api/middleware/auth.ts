import { Elysia } from "elysia";

/**
 * Beispiel Session-Datentyp (anpassen nach DB Schema)
 */
interface SessionRecord {
  userId: string
  role: string
  email?: string
  displayName?: string
  permissions?: string[]
  expiresAt: Date
  revoked?: boolean
}

/**
 * Platzhalter für DB-Lookup. Implementierung anpassen.
 */
async function getSessionByToken(token: string): Promise<SessionRecord | null> {
  // TODO: DB Abfrage (z.B. Prisma, Drizzle, Raw SQL)
  // Beispiel:
  // return prisma.session.findUnique({ where: { token } })
  return null
}

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
    .derive(async ({ request, set }) => {
        const url = new URL(request.url)

        // /auth und alle Subpfade überspringen
        if (url.pathname === '/auth' || url.pathname.startsWith('/auth/')) {
            return {}
        }

        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
            set.status = 401
            throw new Error('Unauthorized')
        }

        const token = authHeader.slice(7).trim()
        if (!token) {
            set.status = 401
            throw new Error('Unauthorized')
        }

        const session = await getSessionByToken(token)
        if (!session || session.revoked || session.expiresAt < new Date()) {
            set.status = 401
            throw new Error('Invalid or expired token')
        }

        return {
            user: {
                id: session.userId,
                role: session.role,
                email: session.email,
                displayName: session.displayName,
                permissions: session.permissions ?? []
            },
            session
        }
    })
    .derive(({ headers }) => {
        const auth = headers['Authorization']

        return {
            bearer: auth?.startsWith('Bearer ') ? auth.slice(7) : null
        }
    })