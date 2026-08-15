import { generatePdf } from "./generatePdf";
import { industrialDb } from "./industrialDb";

export type WaybillItem = { description: string; quantity: string | number; unit?: string };

export interface WaybillData {
  organizationId?: string;
  deliveryId?: string | null;
  salesOrderId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  idempotencyKey?: string | null;
  waybillId?: string;
  documentNumber?: string;
  date: string;
  driver: string;
  vehicle: string;
  destination: string;
  destinationState?: string | null;
  siteName?: string | null;
  projectName?: string | null;
  items?: WaybillItem[];
  notes?: string | null;
  organizationName?: string;
  logoUrl?: string | null;
  issuedBy?: string;
  status?: string | null;
  printCount?: number;
}

export type PersistedWaybill = WaybillData & {
  id: string;
  document_number: string;
  waybill_date: string;
  print_count: number;
  organization_id: string;
  delivery_id?: string | null;
  sales_order_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  destination_state?: string | null;
  site_name?: string | null;
  project_name?: string | null;
  items: WaybillItem[];
  status: string;
};

function persistedToWaybillData(record: PersistedWaybill, watermark?: string): WaybillData {
  return {
    waybillId: record.id,
    organizationId: record.organization_id,
    deliveryId: record.delivery_id ?? null,
    salesOrderId: record.sales_order_id ?? null,
    clientId: record.client_id ?? null,
    projectId: record.project_id ?? null,
    documentNumber: record.document_number,
    date: record.waybill_date,
    driver: record.driver,
    vehicle: record.vehicle ?? "",
    destination: record.destination,
    destinationState: record.destination_state ?? null,
    siteName: record.site_name ?? null,
    projectName: record.project_name ?? null,
    items: Array.isArray(record.items) ? record.items : [],
    notes: record.notes ?? null,
    organizationName: record.organizationName,
    logoUrl: record.logoUrl,
    issuedBy: record.issuedBy,
    status: watermark ?? record.status,
    printCount: record.print_count,
  };
}

async function renderWaybillPdf(data: WaybillData, watermark?: string): Promise<void> {
  const docNum = data.documentNumber || `WB/${new Date().getFullYear()}/${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const items = data.items?.length ? data.items : [{ description: "Materials in transit", quantity: "—", unit: "" }];
  await generatePdf({
    title: `WAYBILL — ${docNum}`,
    documentId: docNum,
    senderName: data.issuedBy,
    senderDepartment: "Logistics & Dispatch",
    companyName: data.organizationName,
    logoUrl: data.logoUrl,
    stampType: "general",
    showSignature: true,
    watermark,
    contentSections: [
      {
        heading: "Dispatch Details",
        bullets: [
          `Date: ${data.date}`,
          `Driver: ${data.driver || "—"}`,
          `Vehicle: ${data.vehicle || "—"}`,
          `Destination: ${data.destination}${data.destinationState ? `, ${data.destinationState}` : ""}`,
          ...(data.siteName ? [`Site / Recipient: ${data.siteName}`] : []),
          ...(data.projectName ? [`Project: ${data.projectName}`] : []),
          ...(data.printCount && data.printCount > 0 ? [`Print history: copy ${data.printCount + 1}`] : []),
        ],
      },
      ...(data.notes ? [{ heading: "Notes", body: data.notes }] : []),
      {
        heading: "Authorization",
        body: "This waybill authorizes the named driver to convey the listed materials to the stated destination. Present on demand to law enforcement or site personnel.",
      },
    ],
    tableData: {
      columns: [
        { header: "#", dataKey: "n", width: 12 },
        { header: "Description", dataKey: "description" },
        { header: "Quantity", dataKey: "quantity", width: 30 },
        { header: "Unit", dataKey: "unit", width: 25 },
      ],
      rows: items.map((item, index) => ({ n: index + 1, description: item.description, quantity: item.quantity, unit: item.unit ?? "" })),
    },
  });
}

export async function issueWaybill(data: WaybillData): Promise<PersistedWaybill> {
  if (!data.organizationId) throw new Error("Organization context is required to issue a waybill");
  const { data: record, error } = await industrialDb.rpc("issue_waybill", {
    _org_id: data.organizationId,
    _delivery_id: data.deliveryId ?? null,
    _idempotency_key: data.idempotencyKey ?? null,
    _payload: {
      client_id: data.clientId ?? null,
      sales_order_id: data.salesOrderId ?? null,
      project_id: data.projectId ?? null,
      date: data.date,
      driver: data.driver,
      vehicle: data.vehicle,
      destination: data.destination,
      destination_state: data.destinationState ?? null,
      site_name: data.siteName ?? null,
      project_name: data.projectName ?? null,
      items: data.items ?? [],
      notes: data.notes ?? null,
    },
  });
  if (error) throw error;
  return record as PersistedWaybill;
}

export async function generateAndRecordWaybill(data: WaybillData): Promise<PersistedWaybill> {
  const record = await issueWaybill(data);
  try {
    await renderWaybillPdf(persistedToWaybillData(record), "ORIGINAL");
    const { data: printed, error } = await industrialDb.rpc("mark_waybill_printed", { _org_id: record.organization_id, _waybill_id: record.id, _rendered_at: new Date().toISOString() });
    if (error) throw error;
    return printed as PersistedWaybill;
  } catch (error) {
    await industrialDb.rpc("mark_waybill_generation_failed", { _org_id: record.organization_id, _waybill_id: record.id, _error: error instanceof Error ? error.message : "Waybill PDF generation failed" });
    throw error;
  }
}

export async function reprintWaybill(record: PersistedWaybill): Promise<PersistedWaybill> {
  try {
    await renderWaybillPdf(persistedToWaybillData(record), "REPRINT");
    const { data: printed, error } = await industrialDb.rpc("mark_waybill_printed", { _org_id: record.organization_id, _waybill_id: record.id, _rendered_at: new Date().toISOString() });
    if (error) throw error;
    return printed as PersistedWaybill;
  } catch (error) {
    await industrialDb.rpc("mark_waybill_generation_failed", { _org_id: record.organization_id, _waybill_id: record.id, _error: error instanceof Error ? error.message : "Waybill reprint failed" });
    throw error;
  }
}

export { renderWaybillPdf };
