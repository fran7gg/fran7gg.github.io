# FRAN7 Security Review: Public Rate Limits

**Reviewed:** 2026-10-27

## Summary

The storefront is static, so client-side throttling can improve user experience but cannot enforce limits: callers can invoke public APIs directly. Server-side enforcement belongs in the API service or a trusted gateway.

The Supabase AI function now checks persistent limits through the database migration in `supabase/migrations/20261027080000_fran7_ai_rate_limits.sql`. The migration and function must both be deployed before these limits are active. PocketBase deployment settings and collection rules are managed outside this repository and could not be verified. The published frontend currently has no PocketBase cloud URL configured by default.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟡 MEDIUM | `supabase/functions/fran7-ia/index.ts` | 119-133 | The AI function permits unauthenticated requests. Persistent IP and global rate limits are implemented in source, but remain inactive until the database migration and Edge Function are deployed; anonymous callers can otherwise incur upstream AI costs. | 8/10 |
| 2 | 🟡 MEDIUM | `assets/js/pocketbase-auth.js` | 196, 212, 228 | Signup and password login have no visible throttling. If a public PocketBase instance is configured, automated account creation and password guessing must be limited by the server, not this client. | 8/10 |
| 3 | 🟡 MEDIUM | `assets/js/fran7-checkout.js` | 149-161 | Guest order creation sends an unauthenticated request without application-level throttling. If the PocketBase collection permits public writes, automated submissions can create unwanted records. | 8/10 |

## Suggested starting limits

Tune the applied limits using traffic and false-positive monitoring. PocketBase limits are recommendations and are not enforceable from this static website.

| Route / operation | Suggested limit | On limit |
|---|---|---|
| `POST /functions/v1/fran7-ia` | Enforced in source: 5 requests per source IP per minute, 30 per source IP per hour, and 500 admitted requests globally per UTC day | HTTP `429`; numeric `Retry-After` in seconds |
| `POST /api/collections/usuarios_loja/auth-with-password` | 5 failed attempts per account per 15 minutes and 20 attempts per source IP per 15 minutes; use an escalating temporary cooldown rather than permanent lockout | HTTP `429`; start with `Retry-After: 60`, increasing with repeated abuse |
| `POST /api/collections/usuarios_loja/records` (signup) | 3 requests per source IP per hour | HTTP `429`; `Retry-After: 3600` |
| `POST /api/collections/encomendas/records` (guest orders) | 3 requests per source IP per minute and 10 per source IP per hour | HTTP `429`; `Retry-After: 60` |
| `POST/PATCH /api/collections/avaliacao/records` | 5 writes per authenticated user per minute and 20 per user per day | HTTP `429`; `Retry-After: 60` |
| Public catalog and rating reads | Consider 60 requests per source IP per minute if abuse is observed; cache public catalog responses where practical | HTTP `429`; `Retry-After: 60` |

## Implementation notes

- Apply limits at Supabase Edge Functions, PocketBase hosting, or a trusted gateway. A client-side timer or `localStorage` counter is bypassable and is not a security control.
- For the AI function, `verify_jwt = false` is configured in `supabase/config.toml`. If anonymous use is intentional, enforce abuse controls in the function/gateway and add an aggregate cost guard. CORS `*` is not authentication or rate limiting.
- Deploy the rate-limit migration (`supabase db push`) and then the `fran7-ia` function (`supabase functions deploy fran7-ia`). The current storefront assistant in `assets/js/assistente.js` responds locally and does not call this Edge Function.
- Confirm PocketBase collection rules and hosting-level protections for `usuarios_loja`, `encomendas`, and `avaliacao`; those settings are not included here.
- A `429` response should include a numeric `Retry-After` value in seconds. Clients should preserve and surface that retry interval rather than retrying immediately.
