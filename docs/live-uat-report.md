# NIFHDPE ERP Production UAT Report

**Author:** Manus AI  
**Test date:** 15 August 2026  
**Application:** [NIFHDPE ERP](https://nifhdpe.vercel.app)  
**Repository:** [LRDMX69/nifhdpe](https://github.com/LRDMX69/nifhdpe)  
**Pull request:** [#10 — Fix production UAT workflow integrity defects](https://github.com/LRDMX69/nifhdpe/pull/10)  
**Authenticated test role:** Ola — Administrator  
**Test data policy:** Clearly labelled `UAT` records were created under the user’s explicit authorization.

> **Final verdict: NO-GO for production approval at this point.** The ERP is substantially connected and the repair branch passes local typecheck, unit tests, lint, and production build, but the corrected branch has not yet been live-retested. The public production deployment still exhibits the original Pipe Calculator defect, while the partner-owned Vercel preview is protected by Vercel authentication. In addition, unresolved production defects remain in attendance, leave review, and several untested role/security paths. The correct release decision is **NO-GO until migration/deployment/retest gates are completed**.

## 1. Executive result

The UAT covered route loading, connected sales, procurement, inventory, logistics, HR/payroll, VAT, bank analysis, documents, analytics, PDF generation, validation, propagation, and role-policy surfaces. The system did not behave like isolated CRUD screens: the UAT client propagated into quotations and waybills; quotation, proforma, invoice, receipt, payment, bank-line, procurement, GRN, inventory, salary, loan, VAT, and document records were linked across modules.

The central risk is not general availability. The application loads and many core workflows complete. The central risk is **financial and operational integrity at workflow boundaries**, where the system can record a successful action but carry incorrect totals, incomplete payroll breakdowns, incorrect payment types, stale aggregates, or silent no-ops.

| Measure | Result | Interpretation |
|---|---:|---|
| Primary routes smoke-tested | 22/22 | All inventoried routes loaded in the authenticated administrator session. |
| Major connected workflow areas exercised | 15 | Sales, payments, bank analysis, procurement, inventory, logistics, HR, payroll, loans, VAT, expenses, analytics, documents, attendance, and policy surfaces. |
| Confirmed production defects before repair | 9 | Includes financial mapping, payroll integrity, UI wiring, validation, source loading, stale cache, and selector data integrity. |
| Repository defects repaired | 7 | Repairs are committed in PR #10. |
| Local typecheck/tests/lint/build | 4/4 passed | TypeScript, 26 unit tests, ESLint, and Vite production build passed. |
| Corrected behaviors live-retested | 0 credited | Preview was protected; public production still runs the pre-repair behavior. |
| Final readiness | NO-GO | Merge, migrations, deployment, and live retest remain mandatory gates. |

## 2. Scope, authorization, and evidence standard

Testing was performed against the authorized live application using the supplied administrator session. Synthetic records were prefixed with `UAT` and dated 15 August 2026. The test did not treat a successful toast as sufficient evidence: important outcomes were checked in the UI, through linked modules, and through authenticated REST-visible records where applicable.

The complete granular evidence log is [audit/live-page-results.md](../audit/live-page-results.md). This report is the rewritten decision document; the audit log is the supporting chronology. No production approval is inferred from local tests alone.

## 3. Environment and deployment state

The public application was reachable at `https://nifhdpe.vercel.app` and the authenticated administrator shell loaded successfully. The repair branch is `feat/invoice-waybill-reactive-workflows`, commit `a20b8ae`, with PR [#10](https://github.com/LRDMX69/nifhdpe/pull/10) open against `main`.

Vercel reported the PR deployment as ready, but the preview hostname redirected to Vercel authentication because the project belongs to the partner-owned Vercel scope. No partner account access was attempted. This created a strict release-evidence boundary: the public production site was tested as a control, but a result from production cannot be credited as proof that the unmerged repair branch is deployed.

## 4. Route inventory and shell stability

All 22 primary routes were opened in the authenticated administrator session: Dashboard, Projects, Equipment, Field Reports, HSE, Compliance, Calculator, BOQ, Opportunities, Quotations, Clients, Inventory, Logistics, Finance, Invoices, Procurement, Analytics, HR, Claims, Messages, Documents, and Settings. No blank screen, unrecoverable runtime error, or infinite loading state was observed during the stabilized route pass.

| Route area | Smoke result | Functional depth |
|---|---|---|
| Dashboard, Projects, Equipment, Field Reports, HSE, Compliance, BOQ | Passed | Mostly read-only or empty-state inspection. |
| Opportunities, Quotations, Clients | Passed | Opportunities populated; sales lifecycle exercised through quotation. |
| Inventory, Logistics, Procurement | Passed | GRN, inventory propagation, waybill, and procurement paths exercised. |
| Finance, Invoices, Analytics | Passed | Sales payment, bank analysis, expense, analytics, and PDF paths exercised. |
| HR, Claims, Messages, Documents, Settings | Passed with limits | HR, documents, and policy inspected; some authorization paths blocked. |

## 5. Authentication and administrator session

The supplied administrator credentials authenticated successfully as Ola. The dashboard, finance, HR, settings, documents, and workflow pages retained the authenticated session across navigation. The session was sufficient for administrator UAT and authenticated REST verification.

This is not a full authentication-security sign-off. Password policy, session expiry, account recovery, MFA, concurrent-session invalidation, and all non-administrator login paths were not independently tested.

## 6. Client creation and propagation

A clearly labelled UAT client, `UAT - NIFHDPE QA 2026-08-15`, was created and persisted. The client became available in quotation and waybill selectors, proving that the client directory is connected to downstream commercial and logistics workflows.

This section passes for administrator creation and selector propagation. Client 360 history, duplicate prevention, client edit audit, deletion safety, and cross-organization isolation remain outside the executed evidence.

## 7. Quotation calculation and numbering

Quotation `QUOTATIONS/2026/0001` was created with a grand total of ₦236,768.75. The displayed amount matched an independent calculation using the live test inputs, and the quotation propagated into the later proforma and invoice lifecycle.

The numbering and client-document sequence path worked for the first UAT document. The requested repeated-client suffix rule, such as `27B` for a second document for the same client, was not fully exercised with a second same-client quotation/invoice sequence and therefore remains a targeted regression test.

## 8. Proforma-to-invoice financial integrity

The accepted proforma was `PROFORMA_INVOICES/2026/0001` for ₦236,768.75. The generated invoice was `INVOICES/2026/0001` for ₦205,518.79. The difference was ₦31,249.96 and was not rounding noise: the live quotation stored a 15% profit margin, while the conversion path omitted that commercial component.

**Original result: FAIL — data integrity.** PR #10 includes a corrective `decide_proforma_invoice` implementation that makes the accepted proforma total authoritative and records the profit adjustment in invoice overhead and source metadata. The fix is not credited as live until the migration is applied and the corrected conversion is executed on a deployed build.

## 9. Invoice payment, receipt, and cashflow propagation

A payment was recorded against the UAT invoice, producing receipt `RECEIPTS/2026/0001`, marking the invoice paid, and reducing its balance to ₦0. The payment also became visible in the bank-analysis linkage workflow. The core transaction path passed.

A separate cache defect was observed: Finance initially displayed Total Received as ₦0 immediately after payment and became correct only after an explicit refresh. PR #10 invalidates payment-dependent invoice, receipt, and period-report query state. Live retest of the immediate-refresh behavior remains blocked by the protected preview and the fact that public production has not been updated.

## 10. Bank statement import and ERP linkage

A bank statement import produced one transaction queued for review. The bank line moved from pending review to approved and was linked to the UAT invoice. Finance Bank Analysis showed the reviewed and linked line, demonstrating end-to-end bank-line approval and ERP linkage.

The link dialog exposed all 13 migrated entity types: Invoice, Receipt, Expense, Worker payment, Purchase order, Fuel log, Director account, Staff loan, Loan repayment, Salary schedule, Overtime, VAT entry, and External loan. The UAT expense also appeared as a selectable ERP source with an auto-filled amount of ₦1,000 without creating a duplicate bank relationship.

## 11. Expense logging and downstream propagation

A controlled `UAT expense workflow test labor` expense of ₦1,000 was saved under Labor. It appeared immediately in Finance Expenses with an `Unlinked` bank status and was available in Bank Analysis as a linkable Expense source. This section passes for persistence and source propagation.

Reconciliation of an actual expense bank line was not executed because the only reviewed UAT bank line was already linked to the invoice. That was an intentional safety decision to avoid creating an invalid duplicate linkage.

## 12. Procurement vendor and purchase order

Vendor `UAT Supplier HDPE 2026-08-15` was created. Purchase order `PURCHASE_ORDERS/2026/0001` was created in draft state for one line, 8 metres at ₦15,000, total ₦120,000. Vendor and PO persistence passed.

The direct PO-card Receive GRN button originally failed with `no outstanding line items` because it submitted before setting GRN context and line items. PR #10 changes the action to open the correctly scoped GRN workflow and adds register invalidation/rendering. This repair is not live-credited until the deployed branch is accessible.

## 13. GRN and inventory propagation

The dedicated GRN dialog successfully created `GOODS_RECEIVED_NOTES/2026/0001` with accepted status. Inventory updated to 8 units of `UAT HDPE Pipe 110mm SDR11`, valued at ₦120,000, with a low-stock alert because the minimum was 10. The core GRN-to-inventory propagation passed.

The original Goods Received tab remained empty after successful posting even though the database record existed, confirming a query-render/invalidation defect. PR #10 adds the GRN register query and invalidation. The production retest of this corrected list behavior is pending deployment access.

## 14. Logistics waybill lifecycle

Waybill `WAYBILLS/2026/0001` was issued and printed. A reprint generated copy 2, changed registry status to `reprinted`, and embedded print history in the PDF. The original and reprint both retained durable document records in the registry.

This section passes for issue, print, reprint, numbering, registry creation, and print-history propagation. Delivery scheduling, fleet assignment, fuel deduction, and stock deduction from a completed delivery were not exercised end-to-end.

## 15. PDF generation and document quality

Invoice, receipt, original waybill, and reprint waybill PDFs were downloaded and inspected. Their data was functionally correct, including document numbers, totals, status, reprint labels, and history. The documents showed professional-quality gaps: an empty second page, excessive whitespace, small signature area, and currency-glyph rendering inconsistencies.

**Result: FUNCTIONAL PASS / PRESENTATION IMPROVEMENT REQUIRED.** PDF quality is not a release blocker for data integrity, but it is below the stated industrial-standard target and should be addressed before external customer-facing rollout.

## 16. Document Registry and revision history

The populated registry showed nine numbered documents, including PO, quotation, invoice, proforma, receipt, waybill, GRN, and two worker payments. The reprinted waybill showed its `Reprinted` state and available Reprint action.

The registry continued to show `Some document sources could not be loaded (revisions)` and zero revisions. Source inspection identified the missing live `document_revisions` relation. PR #10 adds the table, indexes, RLS, grants, and a safer profile-name lookup. The repaired registry must be retested after migration/deployment; until then this remains a production-visible FAIL.

## 17. HR attendance

The authenticated Ola session used Check In. After the loading state completed, the page still showed `Not checked in`, zero checked-in counters, no check-in record, and no success toast. No browser-console error appeared.

**Result: FAIL — silent no-op.** This defect was not included in PR #10 because its exact backend response was not yet isolated. It remains a release blocker until the attendance mutation is traced, fixed, and live-tested.

## 18. Leave request and approval workflow

A one-day UAT annual-leave request for 20 August 2026 was submitted and propagated into the HR Leaves queue. The Review action surfaced a confirmed schema/RPC mismatch in the live leave-review path. The MD decision path could not be credited as complete because the HR review step did not complete successfully and the required approver configuration was not available for a clean independent decision test.

**Result: FAIL/BLOCKED — workflow schema and approval configuration.** The exact RPC contract and live migration must be repaired and then retested through pending → HR reviewed → MD approved/rejected → leave usage/balance.

## 19. Payroll and worker-payment integrity

Salary schedule processing completed through submitted, approved, and paid states. The net pay was ₦239,000 and matched independent payroll calculation for the UAT inputs. Finance showed the outgoing worker payment and net cash position.

The persisted salary worker-payment row contained the correct amount and bank account but zeroed breakdown fields, including gross pay, net pay, PAYE, pension, and related components. The loan repayment also produced a worker payment with type `salary` instead of a distinct repayment type. PR #10 maps the breakdown fields, adds `loan_repayment`, and corrects the RPC. Live retest requires a new controlled payroll/loan record after migration; existing corrupted UAT rows should be retained as evidence or clearly marked historical test data.

## 20. Staff loan repayment

A UAT staff loan of ₦60,000 over three months calculated a monthly repayment of ₦20,000. One repayment reduced the outstanding balance to ₦40,000, proving balance arithmetic and loan-repayment linkage at the business level.

The linked worker-payment classification defect remains a data-integrity FAIL until the repaired RPC is deployed and a new repayment proves `type = loan_repayment`, `net_pay = ₦20,000`, and correct bank-account linkage.

## 21. VAT schedule and state selector

A VAT entry was saved with VAT payable ₦16,518.79 and linked to the UAT invoice. The VAT formula and invoice linkage were correct for the tested values.

The state selector persisted `Cross River` when the intended UAT selection was Lagos. This may be an automation-indexing artifact, but the persisted mismatch is evidence of a selector reliability/data-integrity concern. It should be retested manually on the deployed build before VAT receives a full pass.

## 22. Analytics and finance period reporting

Analytics loaded its KPI cards and charts and was filtered to the UAT transaction date. The page rendered the date-filtered billed, collected, expense, cash, inventory, and quotation-related sections against live data. The Finance period-report surface also loaded and reflected the transaction families after refresh.

The initial Finance aggregate staleness means analytics and period-report invalidation must be retested immediately after a new payment without manually refreshing the browser. This was repaired in code but is not yet live-credited.

## 23. Validation and error handling

The original Pipe Calculator accepted zero inputs and returned mathematically formatted zero outputs, which is unsafe for an engineering tool. PR #10 adds positive minimum constraints and a calculate-time guard with a visible validation message. The public production control test after the PR was opened still accepted zero and displayed zero outputs, proving that the repair is not deployed there.

Other invalid-input coverage was partial. Loan repayment validation rejected non-positive amounts and repayment amounts above the outstanding balance. Expired or invalid proforma decisions and linked-financial deletion triggers were checked at the RPC/schema level. A complete negative-input matrix across every form remains outstanding.

## 24. Role-based access and responsive behavior

The administrator session was tested across the main application. Settings showed one visible active HR team member and a policy configuration surface, but there were no safe alternate authenticated sessions for Technical, Logistics, Accounts, HR, Marketing, Trainee, or other configured roles. Changing the only visible user’s role would mutate live authorization and was not performed.

**Result: BLOCKED for complete security sign-off.** Desktop rendering was broadly usable, but mobile/tablet responsive behavior was not fully re-executed in the repair retest. Earlier project context identified opportunity-card overflow as a prior responsive concern; a formal device-width matrix remains required.

## 25. Release decision, risk register, and required gates

The ERP demonstrates meaningful connected-system capability and is not a toy CRUD implementation. Nevertheless, the production decision is **NO-GO** because financial data integrity, silent HR behavior, missing revision-source loading, and incomplete authorization evidence are material risks. The local repair branch is a candidate for controlled deployment, not proof of production readiness.

| Risk | Severity | Current state | Required gate |
|---|---|---|---|
| Proforma total differs from converted invoice | Critical | Repaired in PR, not live-retested | Apply migration; create new UAT conversion; compare totals exactly. |
| Payroll breakdown fields stored as zero | Critical | Repaired in PR, not live-retested | Apply migration; pay new salary schedule; inspect all breakdown columns. |
| Loan repayment classified as salary | High | Repaired in PR, not live-retested | Record new repayment; verify enum/type, amount, net pay, and linkage. |
| Attendance Check In silent no-op | Critical | Unfixed | Trace mutation/network response; fix and live-test. |
| Leave review RPC/schema mismatch | Critical | Unfixed | Align RPC contract/migration; complete HR and MD decisions; verify usage. |
| Document Registry revisions source warning | High | Repaired in PR, not live-retested | Apply table migration; verify registry warning disappears and revisions render. |
| GRN direct action/list refresh | High | Repaired in PR, not live-retested | Use PO-card action and verify GRN record/list/inventory propagation. |
| Finance aggregate stale after payment | High | Repaired in PR, not live-retested | Record new payment and verify immediate summary without manual refresh. |
| Pipe Calculator zero-input acceptance | High | Public production still fails | Deploy repair; verify zero/negative rejection and valid calculations. |
| Full role-based access matrix | High | Blocked by missing safe role sessions | Provide test accounts or safe role-switch harness; test deny/allow matrix. |
| PDF layout quality | Medium | Functional but visually weak | Remove empty pages, improve signatures, whitespace, and currency fonts. |

### Required release gates

The branch must be merged or exposed through an authorized preview bypass, and the two new migrations must be applied to the live database. The following must then be executed on the deployed build: a fresh proforma conversion with exact total equality; a fresh salary payment with non-zero breakdown columns; a fresh loan repayment with `loan_repayment` type; a PO-card GRN receipt with visible GRN register refresh; an immediate Finance payment-summary check; a revision-bearing Document Registry check; and zero/negative Pipe Calculator checks.

Attendance and leave remain separate blockers and must be fixed before approval. Finally, the complete role matrix and mobile/tablet viewport matrix must be executed without mutating the only production HR account.

## References

[1]: https://nifhdpe.vercel.app "NIFHDPE ERP public production deployment"

[2]: https://github.com/LRDMX69/nifhdpe/pull/10 "NIFHDPE UAT repair pull request #10"

[3]: ../audit/live-page-results.md "NIFHDPE live UAT evidence log"

[4]: https://github.com/LRDMX69/nifhdpe/tree/feat/invoice-waybill-reactive-workflows "NIFHDPE repair branch"
