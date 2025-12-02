# NowIP API & DNS Service

> Bun-powered backend that exposes the NowIP REST API, DDNSv2 endpoint, and the authoritative DNS server that serves your dynamic records.

Need the Nuxt frontend and UX workflow instead? Check [`APP/README.md`](https://git.leicraftmc.de/NowIP/APP/README.md).

## Why this service exists
- **Unified control plane** – Hono routes for auth, account settings, domains, DNS records, and DDNS credentials consumed by the Nuxt app and other clients.
- **Embedded DNS** – `better-dns` hybrid store combines live domain IPs with custom JSON overrides, so the API process can answer A/AAAA/MX/TXT/etc. directly.
- **Operational ergonomics** – Drizzle ORM + SQLite, Scalar-powered OpenAPI docs, typed config parser, and auto-seeded admin credentials to make bootstrap painless.

## Topology
```
┌──────────┐     HTTPS (REST/JSON)      ┌─────────────┐
│  Clients │ ─────────────────────────▶ │  Hono API   │
└──────────┘                           │  (Bun)      │
													 ├─────────────┤
													 │ Auth / DDNS │
													 │ Domains     │
													 │ Account     │
													 └────┬────────┘
															│Drizzle ORM
															▼
													 SQLite (data/db.sqlite)
															│
															▼ DNS queries (UDP/TCP)
													 better-dns authoritative server
```

## Repo layout (API/)
```
src/
  index.ts          # Boots config → DB → API → DNS server
  api/              # Hono routers, middleware, docs helpers
  db/               # Drizzle schema + DB bootstrap helpers
  dns-server/       # better-dns integration and record store
  utils/            # Config loader, logger, miscellaneous helpers
scripts/
  db-utils.ts       # Ensures ./data exists before migrations
drizzle/            # Generated SQL migrations + journal
data/               # SQLite DB file and seeded admin credentials
```

## Requirements
- [Bun](https://bun.sh) **1.1+** (runtime + package manager)
- Open TCP port for the REST API (default `3003`)
- Open UDP/TCP port for DNS responses (default `53`; use `5353` locally if needed)
- SQLite (bundled with Bun) filesystem access under `API/data/`

## Setup
1. **Copy environment file**
	```bash
	cp example.env .env
	```
2. **Install deps**
	```bash
	bun install
	```
3. **Ensure the data directory exists** (handled automatically when running DB scripts, but safe to pre-create):
	```bash
	bun scripts/db-utils
	```
4. **Run migrations**
	```bash
	bun db:migrate
	```
	This will generate/upgrade `data/db.sqlite` and seed the `system_configs` table.
5. **Start the stack**
	```bash
	bun run dev
	```
	- REST API: `http://NOWIP_API_HOST:NOWIP_API_PORT` (defaults to `http://[::]:3003`).
	- DNS server: `NOWIP_DNS_HOST:NOWIP_DNS_PORT` (defaults to both protocols on port 53).
	- OpenAPI docs: `http://localhost:3003/docs` (Scalar UI).
	- Ready to use the UI? Follow the steps in [`APP/README.md`](https://git.leicraftmc.de/NowIP/APP/README.md) and point `NOWIP_API_URL` to this instance.
6. **Grab the bootstrap admin credentials**
	- On first boot the DB insert logs a random password for user `admin` and writes it to `data/initial_admin_credentials.txt`. Change it immediately.

## Key environment variables (`.env`)
| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NOWIP_FRONTEND_URL` | ✅ | `http://localhost:3000` | CORS origin + cookie domain for the Nuxt app. |
| `NOWIP_APP_ENABLE_SIGNUP` | Optional | `false` | Enables public signup routes when true. |
| `NOWIP_API_HOST` | Optional | `::` | Interface bound by Bun’s HTTP server. |
| `NOWIP_API_PORT` | Optional | `3003` | HTTP port for REST + DDNSv2 endpoints. |
| `NOWIP_DB_PATH` | Optional | `./data/db.sqlite` | SQLite file location used by Drizzle + migrations. |
| `NOWIP_LOG_LEVEL` | Optional | `info` | `debug`, `info`, `warn`, `error`, `critical`. |
| `NOWIP_DNS_HOST` | Optional | `::` | Interface for the DNS server (both UDP/TCP). |
| `NOWIP_DNS_PORT` | Optional | `53` | DNS listening port. Change to `5353` during local dev. |
| `NOWIP_DNS_DOMAIN` | ✅ | — | Base zone served (e.g., `dyn.is-on.net`). |
| `NOWIP_DNS_NS_PRIMARY` | ✅ | — | Primary NS record advertised in answers. |
| `NOWIP_DNS_NS_SECONDARY` | Optional | — | Secondary NS record if available. |
| `NOWIP_DNS_CUSTOM_RECORDS_FILE` | Optional | `./config/custom-records.json` | Static JSON records merged into the hybrid store. |

## Common scripts
| Command | Description |
| --- | --- |
| `bun run dev` | Watches `src/**`, hot restarts API + DNS. |
| `bun run start` | Executes `src/index.ts` without watch (production). |
| `bun db:generate` | Generates SQL migration files from `src/db/schema.ts`. |
| `bun db:migrate` | Applies migrations.
| `bun db:push` | Pushes schema directly (useful for dev resets). |
| `bun scripts/db-utils` | Creates `./data` directory if missing. |

## API surface overview
| Area | Routes | Notes |
| --- | --- | --- |
| Auth | `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` | Session cookies stored in `sessions` table. |
| Account | `GET/PUT /account`, `PUT /account/password`, `POST /account/logout`, `DELETE /account` | User profile + credential rotation. |
| Domains | `GET/POST /domains`, `GET/PUT/DELETE /domains/:id` | CRUD for DDNS-enabled subdomains. |
| DNS Records | `GET/POST /domains/:id/records`, `GET/PUT/DELETE /domains/:id/records/:recordId` | User-managed records beyond the live A/AAAA updates. |
| DDNSv2 | `GET /nic/update` | Compatible with clients using DynDNS v2 protocol (`hostname`, `myip`). |
| Misc | `GET /` | Health indicator (JSON). |

Scalar-powered docs live at `/docs`; the OpenAPI JSON consumed by the Nuxt client is served at `/docs/openapi`.

## DNS & DDNS behavior
- `DNSServer` boots alongside the API and loads:
  1. **SOA/NS data** derived from the `NOWIP_DNS_*` env vars.
  2. **Static overrides** defined in `NOWIP_DNS_CUSTOM_RECORDS_FILE` (`@`, `subdomain`, record type arrays).
  3. **Per-domain additions** stored in `additional_dns_records` (created via REST UI/API).
  4. **Live apex A/AAAA answers** sourced from `domains.last_ipv4` / `.last_ipv6`, updated by DDNSv2 check-ins.
- The DDNS endpoint expects HTTP Basic Auth where username = domain ID, password = `ddnsv2_api_secret`. Successful updates write the latest IPv4/IPv6 and timestamp, then respond with `good <ip>`.

## Database schema (Drizzle)
- `users`, `sessions`, `password_resets`
- `domains` – owner, subdomain, last IPs, DDNS secret
- `additional_dns_records` – typed JSON payload validated before insertion
- `system_configs` – reserved key-value storage (e.g., DNS serial)

Migrations are tracked under `drizzle/` with `_journal.json` for versioning.

## Observability & logging
- `utils/logger.ts` controls levels (`NOWIP_LOG_LEVEL`).
- Request validation errors surface as structured JSON with Zod issues; other errors become `500` responses with `success:false`.

## Troubleshooting
- **`EACCES` on port 53**: run with elevated privileges or change `NOWIP_DNS_PORT` to a high port and adjust your testing commands (`dig @127.0.0.1 -p 5353 ...`).
- **`badauth` from `/nic/update`**: ensure you are using the numeric `domain.id`, the correct `ddnsv2_api_secret`, and the `hostname` matches the stored subdomain.
- **CORS/session issues**: verify `NOWIP_FRONTEND_URL` exactly matches the origin hitting the API (scheme, host, port).
- **Missing admin credentials**: delete `data/db.sqlite` (dev only) and rerun migrations to trigger the bootstrap script.
- **Custom record ignored**: confirm the JSON schema (array per record type) and restart the API, as overrides load at boot.

## Contributing & next steps
- Keep schema edits in `src/db/schema.ts` and run `bun db:generate` to produce migration files.
- Regenerate the OpenAPI client by starting the API (`/docs/openapi`) then running `bun run api-client:generate` from the `APP/` workspace.
- Please open issues/PRs for ideas like pluggable storage engines, rate limiting, or DNSSEC support.

Happy hacking! The NowIP API is the heart of the platform—treat it like critical infrastructure.