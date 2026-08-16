# Permission Boundary Evidence — 2026-08-16

## Live account available

The authenticated live QA session used the maintenance account `Ola` with effective role `administrator` and `isMaintenance=true`. The maintenance path intentionally exposes the full navigation and administrative controls. No separate live accounts for Technical, Logistics, Accounts/Finance, HR, Marketing, Knowledge Manager, or Trainee roles were available in this session.

## Implemented navigation matrix

The source role matrix defines the following module boundaries. Administrator has full access. Technical (`engineer`/`technician`) has Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, HR, Claims, Messages, and Documents. Logistics (`warehouse`) has Equipment, Inventory, Logistics, Procurement, BOQ, HR, Claims, Messages, and Documents. Accounts (`finance`) has BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. HR has HSE, Quotations, Clients, Logistics, Finance, HR, Claims, Messages, and Documents and inherits Finance capability. Marketing (`reception_sales`) has Opportunities, Quotations, BOQ, Clients, Analytics, HR, Claims, Messages, and Documents. Knowledge Manager has Dashboard, HR, Claims, Messages, and Documents. Settings is administrator-only.

## Boundary status

The matrix is documented from code and maintenance-session behavior, but **real permission-boundary execution remains BLOCKED** because no non-maintenance credentials were available. The following cannot be marked PASS without separate role sessions: navigation hiding or route denial, row-level write authorization, Finance/HR approval separation, MD decision controls, cross-organization access, terminated-account handling, Knowledge Manager restrictions, and administrator-only Settings access. A production certification that requires all six blockers to pass must therefore wait for controlled role-account retesting.
