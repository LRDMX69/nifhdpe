
## Local responsive QA — Clients

At `390×844` on the current repository build, `/clients` displayed `Start with your client directory` before the search field and the CRM intelligence disclosure. The task actions were exposed as compact rows for adding a client, finding a client, and opening quotations. Read-only measurement returned `viewport=390`, `documentElement.scrollWidth=390`, and `body.scrollWidth=390`, confirming no horizontal overflow. No business mutation was performed.

## Local responsive QA — Quotations

At `390×844` on the current repository build, `/quotations` exposed the `Start with a client offer` task-first section, the real `quotations-search` control, and the `Quotation specifications` secondary disclosure. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No quotation, order, invoice, or catalogue mutation was performed.

## Local responsive QA — Opportunities

At `390×844` on the current repository build, `/opportunities` displayed `Start with the sales pipeline` and a live link to `/quotations`. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No opportunity, quotation, or intelligence mutation was performed.

## Local responsive QA — Projects

At `390×844` on the current repository build, `/projects` displayed `Start with project execution`, the real `projects-search` target, and a connected `/field-reports` handoff. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No project, execution, material, QA, or handover mutation was performed.

## Local responsive QA — Inventory

At `390×844` on the current repository build, `/inventory` displayed `Start with stock control`, the real `inventory-search` target, and `Inventory intelligence` as a secondary disclosure. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No stock, location, box, or movement mutation was performed.

## Local responsive QA — Logistics

At `390×844` on the current repository build, `/logistics` displayed `Start with dispatch`, the real `logistics-search` target, and a connected `/documents` handoff for issued waybills. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No waybill, delivery, fleet, fuel, or dispatch mutation was performed.

## Local responsive QA — Finance

At `390×844` on the current repository build, `/finance` displayed `Start with money in and money out` with working invoice and bank-analysis tab links. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. The conditional `Finance intelligence` disclosure was not rendered because the production-cleared dataset returned no live finance insight record; no placeholder was introduced and no finance mutation was performed.

## Local responsive QA — Analytics

At `390×844` on the current repository build, `/analytics` displayed `Start with a decision` before the live summary area and exposed `Detailed analytics` as a secondary disclosure. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No reporting range, export, or source record was changed.

## Local responsive QA — Procurement

At `390×844` on the current repository build, `/procurement` displayed `Start with procurement` and all four lifecycle tabs: Vendors, Purchase Orders, Goods Received, and Requisitions. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. The browser reported 194 console errors during loading, so this route requires a console classification pass before final certification; no procurement mutation was performed.

### Procurement console recheck

After making GRN line-item synchronization idempotent, reloading `/procurement` produced only two non-layout browser errors: a notification-permission request outside a user gesture and a rejected `__cf_bm` cookie on the Supabase realtime websocket. The prior maximum-update-depth loop no longer appeared. The page remained read-only.

## Local responsive QA — Field Reports

At `390×844` on the current repository build, `/field-reports` displayed the role-aware `Start with…` task section, a real `field-reports-list` jump target, and a connected `/hse` link. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No report submission, AI processing, print, message, or offline-sync action was performed.

## Local responsive QA — HSE

At `390×844` on the current repository build, `/hse` displayed `Start with a safety action`, a connected `/compliance` link, and both Incidents and Toolbox Talks surfaces. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No incident, toolbox talk, or safety record mutation was performed.

## Local responsive QA — Equipment

At `390×844` on the current repository build, `/equipment` displayed `Start with equipment control`, a real `equipment-register` jump target, and a connected `/logistics` link. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No equipment creation, request, approval, maintenance, or deletion action was performed.

## Local responsive QA — Document Registry

At `390×844` on the current repository build, `/documents` displayed `Start with the document you need`, the real `document-registry-search` target, and working Finance and Logistics handoffs. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No document was opened, reprinted, edited, or mutated.

## Local responsive QA — Compliance

At `390×844` on the current repository build, `/compliance` displayed `Start with compliance evidence` with working Projects and Document Registry handoffs. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No compliance document was uploaded, edited, status-changed, or deleted.

## Local responsive QA — BOQ

The first BOQ check exposed that the empty `/boq` route rendered the list state without the detail task panel. The route-level list state was corrected. After reload at `390×844`, `/boq` displayed `Start with quantity estimating` and a working `/calculator` handoff. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No BOQ was created, opened, edited, exported, or deleted.

## Local responsive QA — Pipe Calculator

At `390×844` on the current repository build, `/calculator` displayed `Start an engineering calculation`, a real `pipe-length` input target, and working BOQ and HSE handoffs. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No calculation was run and no record was written.

## Local responsive QA — HR

At `390×844` on the current repository build, `/hr` displayed the role-aware `Start with…` people task section, working leave and payroll tab links, and the existing check-in context. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No check-in, leave, payroll, attendance, or people-record mutation was performed.

## Local responsive QA — Worker Claims

At `390×844` on the current repository build, `/claims` displayed the role-aware `Start with…` claims task section with working Finance and Messages handoffs. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No claim submission, review decision, payable creation, export, or deletion was performed.

## Local responsive QA — Messages

At `390×844` on the current repository build, `/messages` displayed `Start with the conversation`, the real `messages-search` target, and working Projects and Field Reports handoffs. Read-only measurement returned `viewport=390` and `scrollWidth=390`, confirming no horizontal overflow. No chat, broadcast, read-state, or deletion mutation was performed.

## Local responsive QA — Settings

At `390×844` on the current repository build, `/settings` recovered successfully after one transient browser websocket timeout. The snapshot showed the task-start panel above the tab surface, with the Team tab panel contained inside the 390px shell and no visible horizontal overflow. The browser session remained read-only; no organization, role, profile, policy, or feedback setting was saved.

## Desktop containment spot check — Settings

At `1440×900` on the current repository build, `/settings` retained `Start with the setting you need`. Read-only measurement returned `scrollWidth=1440` and `bodyWidth=1440`, confirming no horizontal overflow in the desktop shell.
