import { generatePdf } from "./generatePdf";

export interface WaybillData {
  documentNumber?: string;
  date: string;
  driver: string;
  vehicle: string;
  destination: string;
  destinationState?: string | null;
  siteName?: string | null;
  projectName?: string | null;
  items?: { description: string; quantity: string | number; unit?: string }[];
  notes?: string | null;
  organizationName?: string;
  logoUrl?: string | null;
  issuedBy?: string;
}

/**
 * Generates a printable Waybill PDF — the slip every driver carries with materials
 * for police/checkpoint verification. Includes signature lines for driver,
 * dispatcher and recipient.
 */
export async function generateWaybill(data: WaybillData): Promise<void> {
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
      rows: items.map((it, i) => ({
        n: i + 1,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit ?? "",
      })),
    },
  });
}