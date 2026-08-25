# NO ZZZ Security Model

## Security boundaries

The browser is untrusted. Every write is revalidated and authorized by the API. Venture records are scoped to a server-verified opaque session owner, and sensitive venture briefs are encrypted before storage.

## Controls implemented

- **Fail-closed production configuration:** startup fails unless strong session and encryption secrets are supplied.
- **Secure sessions:** 256-bit opaque tokens, SHA-256 server-side token storage, rotation on authentication, `HttpOnly`, `SameSite=Strict`, path-scoped cookies, and `Secure` in production.
- **Account protection:** passwords use per-user salts and memory-hard scrypt derivation; legacy work factors upgrade automatically after successful login, login errors resist account enumeration, and authentication has a dedicated rate limit. Authenticated founders can rotate their password, which immediately revokes every other signed-in device while keeping the current session.
- **CSRF protection:** all state-changing requests require a session-bound HMAC token compared in constant time.
- **Origin enforcement:** browser origins must match the request host or an explicit allowlist.
- **Strict validation:** Zod schemas reject unknown keys, oversized content, invalid enum values, control characters, and malformed IDs.
- **Tenant isolation:** all storage queries include the server-derived owner ID. Client-provided owner IDs are never trusted.
- **Encryption at rest:** complete venture briefs—including venture names—use AES-256-GCM with a fresh 96-bit IV and authenticated ciphertext. Database files are permissioned `0600` and secure deletion is enabled.
- **Abuse controls:** global and write-specific rate limits return standardized errors.
- **HTTP hardening:** CSP, HSTS in production, MIME sniffing protection, referrer suppression, framing restrictions, and hidden framework identity.
- **Safe observability:** request IDs are returned; cookies, authorization, CSRF tokens, and `Set-Cookie` are redacted from structured logs.
- **Resource limits:** JSON bodies are capped at 32 KB with correct `413` responses, AI provider responses at 1 MB, result sets at 50 records, browser API requests at 20 seconds, outbound AI calls at 15 seconds, and graceful shutdown drains requests.
- **Transactional session rotation:** replacement sessions and anonymous-venture transfers commit atomically before old sessions are revoked, preventing orphaned work during storage failures.
- **Privacy controls:** authenticated founders can export a machine-readable copy or permanently delete their account, sessions, and ventures after password confirmation.
- **Data hygiene:** expired sessions are removed on a rolling basis, and encrypted ventures belonging to vanished guest sessions are cleaned up so unreachable data does not accumulate.
- **Account boundary protection:** authenticated account switching is blocked so one account’s ventures can never be accidentally transferred to another.
- **SQL safety:** prepared statements only, strict tables, bounded constraints, foreign keys, and tenant-indexed queries.
- **Error containment:** malformed JSON and server failures return generic messages without stack traces.

## Required production configuration

Generate secrets outside source control:

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -hex 32      # DATA_ENCRYPTION_KEY
```

Set:

- `NODE_ENV=production`
- `SESSION_SECRET` to at least 32 random characters
- `DATA_ENCRYPTION_KEY` to exactly 64 hexadecimal characters
- `ALLOWED_ORIGINS` to comma-separated trusted origins when API and web origins differ
- `TRUST_PROXY=true` only behind a trusted single-hop reverse proxy

Never reuse development keys, commit `.env` files, or expose these values to `VITE_*` variables.

## Production deployment checklist

1. Terminate TLS 1.2+ at a managed load balancer and redirect HTTP to HTTPS.
2. Store secrets in a cloud secret manager with workload identity and rotation.
3. Put the database on encrypted storage with encrypted, tested backups.
4. Restrict network ingress to the load balancer; do not expose the API or database directly.
5. Run as a non-root user with a read-only filesystem except the dedicated data mount.
6. Add centralized, immutable audit logging and alerts for rate limits, CSRF failures, and anomalous access.
7. Run `npm ci`, `npm audit`, `npm test`, SAST, secret scanning, and container scanning in CI.
8. Replace anonymous sessions with a production identity provider before handling payments or multiple human users.
9. Use delegated OAuth connections and scoped, short-lived tokens for external business tools; never store raw provider passwords.
10. Schedule independent penetration testing before processing customer data or money.

## Reporting vulnerabilities

Do not open a public issue containing exploit details or secrets. Report privately to the project security owner with reproduction steps and impact.
