---
name: Redirect host policy
description: Auth/OAuth/email redirect URLs must always match the active host (Vercel, Lovable, preview, custom domain)
type: constraint
---
All auth redirect URLs (OAuth, magic links, password reset, email confirmation) MUST be derived from `window.location.origin` via `getAppUrl()` in `src/lib/appUrl.ts`. NEVER hardcode `nifhdpe.lovable.app`, `nifhdpe.vercel.app`, or any specific domain. Edge functions that need a redirect host must read `req.headers.get("origin")` and validate it against an allowlist. The Supabase Auth Additional Redirect URLs list must include every host the app is served from.

**Why:** the app is published on both Vercel and Lovable, plus preview hosts. A hardcoded domain breaks sign-in on the other host.
