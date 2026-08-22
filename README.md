# NO 🚫 ZZZ — Autonomous Venture Studio

**Ain't No Sleepin'.** A production-ready foundation for an AI platform that discovers, validates, builds, launches, and operates online businesses.

## Product capabilities

- Personalized venture discovery with working search and opportunity filters
- Six business models scored by viability, market size, and launch speed
- Multi-step Venture Launchpad that turns a founder brief into a complete blueprint
- Working venture Build Room with production roadmap and downloadable blueprint
- Secure server-side workspace for saved ventures
- Founder data export, permanent account deletion, secure login, and logout controls
- AI workforce architecture with six specialized operating agents
- Interactive command center with venture state and agent activity
- Contextual NO ZZZ Operator for research and launch-planning conversations
- Explicit human approval gates, budget controls, and operating guardrails
- Responsive mobile, tablet, and desktop experience

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Secure backend

The application includes a same-origin Express API with self-hosted founder accounts, scrypt password protection, opaque rotating HttpOnly sessions, session-bound CSRF protection, strict origin checks, schema validation, tenant-isolated SQLite queries, AES-256-GCM encryption, rate limits, safe structured logging, hardened HTTP headers, and fail-closed production secrets. The frontend uses this API as its source of truth; venture briefs are not stored in browser local storage.

The NO ZZZ Operator and blueprint engine support any OpenAI-compatible provider through server-only environment variables. When no provider is configured, the app remains fully usable through its deterministic venture engine; API keys are never exposed to the browser.

```bash
npm run lint      # static analysis and React hooks checks
npm test          # security, API, config, and browser-client tests
npm run check     # lint, all tests, and production build
```

See [`SECURITY.md`](SECURITY.md) and [`.env.example`](.env.example) before deployment.

## Publish

A hardened multi-stage `Dockerfile`, locked-down `compose.yaml`, health check, persistent encrypted data volume, and GitHub Actions security pipeline are included.

```bash
cp .env.example .env
# Generate SESSION_SECRET and DATA_ENCRYPTION_KEY as documented in .env.example
npm run check
npm run build
NODE_ENV=production npm start
```

Or deploy the container:

```bash
SESSION_SECRET="$(openssl rand -base64 48)" \
DATA_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
docker compose up --build -d
```

Before accepting real payments or granting agents access to third-party tools, connect production OAuth applications, a transactional email provider, billing, and managed backups. Those services require accounts and credentials owned by the publisher and intentionally cannot be embedded in source code.

## Demo content

The landing page and command center include illustrative operating figures (revenue, active agents, campaign states) for product preview. They are clearly labeled in the UI and are not connected to real accounts, payments, or tools. Wire them to your live integrations before marketing real numbers.

## Runtime and storage notes

- Requires Node.js **22.5+** (pinned to `node:22-alpine` in the container). The data layer uses the built-in `node:sqlite` module, which is still marked experimental by Node — the warning is suppressed in the production `start` script and container. The API surface used (prepared statements, strict tables, WAL) is small and covered by the test suite; the database file is a single portable file under `data/`. For multi-instance scale-out, migrate to a managed database (e.g. Postgres) or `better-sqlite3`; the storage layer is isolated in `server/store.js`.
- Back up `data/nozzz.db` (plus its `-wal`/`-shm` files) regularly. The database is encrypted only for venture briefs, not the whole file; keep it on encrypted storage and rotate `DATA_ENCRYPTION_KEY` only by re-encrypting data.
- `npm run check` runs lint, the full security/API test suite, and a production build. CI runs the same pipeline plus `npm audit` and a container build.
