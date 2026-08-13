# NIFHDPE Industrial ERP

NIFHDPE is NIF Technical Company’s React/Vite/Supabase operations platform for HDPE pipe supply, installation, project execution, logistics, finance, HSE, workforce, and after-sales service. The application is designed around connected records rather than isolated spreadsheets: quotations carry controlled product and opportunity context, accepted commercial records can become sales orders, orders can feed projects and stock reservations, and operational evidence is retained for finance, quality, and handover.

## Technology

The application uses React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Supabase Auth/Postgres/Storage/Edge Functions, Recharts, jsPDF, and `react-router-dom`. The canonical application roles are `administrator`, `engineer`, `technician`, `warehouse`, `finance`, `hr`, `reception_sales`, `knowledge_manager`, `siwes_trainee`, `it_student`, `nysc_member`.

## Local development

Use Node.js 22 or a compatible current LTS release.

```sh
git clone https://github.com/LRDMX69/nifhdpe.git
cd nifhdpe
npm install
npm run dev
```

The project requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The current private-repository deployment pattern retains `.env.production` for the Vercel build. The safer long-term alternative is to configure the same values in Vercel Project Settings → Environment Variables and rotate any credentials if repository exposure is a concern. `.env.production.example` documents the variable names without containing a live credential.

## Native module ownership

Connected workflow actions are intentionally kept inside the pages that own the business record. Quotations contains the HDPE Product Catalogue and product-linked line items. Projects contains confirmed sales-order-to-project conversion. Procurement owns partial goods receipt and stock-ledger posting. Logistics owns dispatch and proof-of-delivery completion. Finance owns invoicing, receipts, payments, and reporting. HSE owns the organization-scoped incident register. Equipment owns requests, maintenance, and project assignment. There is no standalone Operations Control or Product Master page; old bookmarks redirect into the existing dashboard or Quotations workflow.

## Verification commands

```sh
npm run typecheck
npm run typecheck:strict
npm run lint
npm test -- --run
npm run build
npm audit --audit-level=high
git diff --check
```

## Vercel deployment

The production build is generated with `npm run build` and served from `dist`. Configure or preserve the following variables for the Vercel Production and Preview environments:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-client-key
```

If the variables are absent, the application displays a branded deployment-status screen instead of a blank page. The Vercel preview may require an authenticated Vercel session before it can be inspected.

## Supabase deployment sequence

Apply the repository migrations in timestamp order, including the commercial-finance completeness migration and the guarded BOQ specification connector migration. After deployment, refresh the PostgREST schema cache and regenerate the client types from the target project:

```sh
npx supabase gen types typescript --project-id pxuqddhgbkjwykeirkmz > src/integrations/supabase/types.ts
```

The Logistics page contains migration-dependent order and delivery fields. If those operations report missing columns or tables before the migrations are applied, that is an environment deployment issue rather than a reason to reintroduce a parallel control page.

## Documentation

The implementation and verification evidence is maintained in [`docs/nifhdpe-full-suite-report.md`](docs/nifhdpe-full-suite-report.md). The report separates completed technical work, environment-dependent checks, and management-policy decisions that must remain configurable.
