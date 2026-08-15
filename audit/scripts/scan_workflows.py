from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
MIGRATIONS = ROOT / "supabase" / "migrations"
OUT = ROOT / "audit" / "generated" / "workflow-touchpoints.json"

KEY_ENTITIES = [
    "clients", "opportunities", "quotations", "quotation_items", "proforma_invoices",
    "sales_orders", "sales_order_items", "invoices", "invoice_items", "receipts",
    "deliveries", "delivery_items", "waybills", "purchase_orders", "purchase_order_items",
    "goods_received_notes", "inventory", "stock_movements", "expenses", "worker_payments",
    "bank_transactions", "finance_transaction_links", "vat_schedule_entries", "hr_salary_schedules",
    "hr_overtime_entries", "hr_staff_loans", "hr_loan_repayments", "leave_requests",
    "disciplinary_records", "document_revisions", "business_audit_events",
]

source_files = sorted(SRC.rglob("*.ts")) + sorted(SRC.rglob("*.tsx"))
source_text = {path: path.read_text(encoding="utf-8", errors="ignore") for path in source_files}
migration_files = sorted(MIGRATIONS.glob("*.sql"))
migration_text = {path: path.read_text(encoding="utf-8", errors="ignore") for path in migration_files}

rows = []
for entity in KEY_ENTITIES:
    reads = []
    mutations = []
    rpc_context = []
    table_pattern = re.compile(rf'\.from\(["\']{re.escape(entity)}["\']\)')
    for path, text in source_text.items():
        for match in table_pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            after = text[match.end():match.end() + 500]
            method_match = re.search(r"\.([a-zA-Z]+)\(", after)
            method = method_match.group(1) if method_match else "unknown"
            record = {"file": str(path.relative_to(ROOT)), "line": line, "method": method}
            if method in {"insert", "update", "upsert", "delete"}:
                mutations.append(record)
            else:
                reads.append(record)
    rpc_pattern = re.compile(r'\.rpc\(["\']([a-zA-Z0-9_]+)["\']')
    for path, text in source_text.items():
        for match in rpc_pattern.finditer(text):
            rpc_name = match.group(1)
            line = text.count("\n", 0, match.start()) + 1
            if entity.rstrip("s") in rpc_name or entity in rpc_name:
                rpc_context.append({"file": str(path.relative_to(ROOT)), "line": line, "rpc": rpc_name})
    db_mentions = []
    db_pattern = re.compile(rf'\b{re.escape(entity)}\b', re.IGNORECASE)
    for path, text in migration_text.items():
        if db_pattern.search(text):
            db_mentions.append(str(path.relative_to(ROOT)))
    rows.append({
        "entity": entity,
        "source_reads": reads,
        "source_mutations": mutations,
        "source_related_rpcs": rpc_context,
        "migration_files_mentioning_entity": db_mentions,
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"root": str(ROOT), "entities": rows}, indent=2) + "\n", encoding="utf-8")
print(OUT)
