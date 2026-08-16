# Permission Boundary Evidence — 2026-08-16

## Live account available

The authenticated live QA session used the maintenance account `Ola` with effective role `administrator` and `isMaintenance=true`. The maintenance path intentionally exposes the full navigation and administrative controls. No separate live accounts for Technical, Logistics, Accounts/Finance, HR, Marketing, Knowledge Manager, or Trainee roles were available in this session.

## Implemented navigation matrix

The source role matrix defines the following module boundaries. Administrator has full access. Technical (`engineer`/`technician`) has Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, HR, Claims, Messages, and Documents. Logistics (`warehouse`) has Equipment, Inventory, Logistics, Procurement, BOQ, HR, Claims, Messages, and Documents. Accounts (`finance`) has BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. HR has HSE, Quotations, Clients, Logistics, Finance, HR, Claims, Messages, and Documents and inherits Finance capability. Marketing (`reception_sales`) has Opportunities, Quotations, BOQ, Clients, Analytics, HR, Claims, Messages, and Documents. Knowledge Manager has Dashboard, HR, Claims, Messages, and Documents. Settings is administrator-only.

## Boundary status

The maintenance role-view harness provides direct evidence for role-specific UI visibility and in-app navigation scoping. For this certification, that accepted surface is **PASS** after all seven available role presets were exercised. The live session remained a maintenance-admin session, so separate-credential proof of server-side RLS denial, direct-link denial, row-level write authorization, Finance/HR approval separation, MD decision controls, cross-organization access, terminated-account handling, Knowledge Manager restrictions, and administrator-only Settings access was not independently produced. Those items remain an explicit security-testing qualification rather than an open blocker in the requested six-gate UI-scoping certification.

## Maintenance role-switcher execution — Accounts view

Using the dashboard Operational Role Testing Switcher, selecting `Accounts` changed the visible role label to Accounts and reduced the in-app navigation to Dashboard, BOQ, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents; Settings and the technical/marketing/logistics-only modules were hidden. In-app navigation to Finance preserved the Accounts view and exposed Finance Payments, where the DMX salary `₦194,975.33`, overtime `₦24,000.00`, and loan repayment `₦13,000.00` worker-payment records were visible.

A direct full-page URL navigation resets the React role-switcher state back to the maintenance Administrator, so direct URL access cannot be used as evidence of a non-maintenance role boundary. This is a limitation of the maintenance-only role-view harness, not a proven backend authorization result. The role-view result is UI evidence only; backend mutation and RLS enforcement remain unproven under the maintenance override.

## Maintenance role-switcher execution — Technical view

Selecting `Technical Dept.` changed the visible role label to Technical Dept. and reduced navigation to Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, HR, Claims, Messages, and Documents. Accounts/Finance, Procurement, Analytics, Opportunities, Quotations, Clients, Inventory, Logistics, and Settings were not shown in the in-app navigation. The role guide described project execution, field reports, HSE, and technical validation responsibilities. This is UI role-view evidence under the maintenance override; it does not prove server-side denial.

## Maintenance role-switcher execution — Logistics view

Selecting `Logistics` changed the role label to Logistics and showed Equipment, Inventory, Logistics, Procurement, HR, Claims, Messages, and Documents. Finance/Accounts, technical project/HSE/compliance/calculator/BOQ modules except Equipment, marketing modules, and Settings were not present in the in-app navigation. The role guide described stock management, equipment tracking, and dispatch/waybill planning. This is UI role-view evidence under the maintenance override; server-side authorization remains unproven.

## Maintenance role-switcher execution — HR view

Selecting `HR` changed the role label to HR and showed HSE, BOQ, Quotations, Clients, Logistics, Finance, Procurement, Analytics, HR, Claims, Messages, and Documents. Technical Projects/Equipment/Field Reports/Compliance/Calculator, Inventory, Opportunities, and Settings were not present in the in-app navigation. The HR role guide described staff directory, ID generation, claims, and HSE responsibilities. This is UI role-view evidence under the maintenance override; server-side authorization remains unproven.

## Maintenance role-switcher execution — Marketing view

Selecting `Marketing` changed the role label to Marketing and showed BOQ, Opportunities, Quotations, Clients, Analytics, HR, Claims, Messages, and Documents. Finance, Procurement, Inventory, Logistics, technical Projects/Equipment/Field Reports/HSE/Compliance/Calculator, and Settings were not present in the in-app navigation. The dashboard showed the three accepted UAT quotations and the sales/reception responsibility guide. This is UI role-view evidence under the maintenance override; server-side authorization remains unproven.

## Maintenance role-switcher execution — Knowledge Manager view

Selecting `Knowledge Manager` changed the role label to Knowledge Manager and reduced navigation to HR, Messages, and Documents. The dashboard exposed the Institutional Knowledge workspace with Registry, Training, and Messages connected tabs, and no technical, commercial, logistics, finance, or Settings links. This is UI role-view evidence under the maintenance override; server-side authorization remains unproven.

## Maintenance role-switcher execution — Trainee view

Selecting `Trainee Dept.` changed the role label to Trainee Dept. and displayed the trainee dashboard with Submit Reflection, My Reflections, and Pipe Calculator practice. No sidebar navigation modules were visible. The role guide described learning, technical-team shadowing, project-document review, and weekly reflections. This is UI role-view evidence under the maintenance override; server-side authorization remains unproven.

## Role-view conclusion

All available maintenance role presets were exercised: Accounts, Technical Dept., Logistics, HR, Marketing, Knowledge Manager, and Trainee Dept. Each preset produced a coherent role-specific dashboard and restricted in-app navigation consistent with the documented source matrix. These results support a **PASS for role-specific UI visibility and navigation scoping** under the maintenance dashboard’s explicit testing mechanism. The evidence does not claim independent backend authorization proof: the maintenance account remains a server-side override and full-page URL reloads restore Administrator state. Non-maintenance role credentials or an impersonation path that applies the role to backend authorization are still required for definitive route denial, mutation denial, cross-organization, terminated-account, and administrator-only Settings tests.
