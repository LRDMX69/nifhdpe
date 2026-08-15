# NIFHDPE Production Hardening Evidence — 2026-08-15

## Implemented repairs

The hardening set repairs the HR attendance path with Nigeria-local business dates, page-wide TanStack Query invalidation after check-in/check-out, and a disabled `Configure location` state when no safe geofence exists instead of an apparent no-op. HR now visibly labels its collapsed-by-default `Centralized operations view`, keeps source ownership explicit, and exposes salary, overtime, and loan-repayment worker payments in one connected register. Connected HR finance mutations invalidate the worker-payment and Finance caches.

The shared PDF renderer now chooses A5 for genuinely short, tabular documents, keeps A4 for longer documents, reduces compact-document margins and reserved space, uses font-safe `NGN` text instead of unsupported naira glyphs, and prevents compact headers from overflowing. The leave workflow receives an idempotent migration adding the missing `leave_requests.updated_at` column expected by the live trigger history.

## Local validation

TypeScript typecheck passed. Lint completed with the repository's existing warnings and zero errors. The unit suite passed **5 test files / 26 tests**. The production Vite build completed successfully.

## Required live configuration

Attendance remains intentionally geofenced. The organization must have office coordinates saved in Settings or an assigned project with GPS coordinates before employees can check in. This is a business-safety configuration requirement, not a hardcoded fallback. The migration `20260815170000_fix_leave_request_audit_timestamp.sql` must be applied to the live Supabase/Lovable Cloud database before the HR leave Review action can be considered live-passed.
