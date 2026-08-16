import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import letterheadBgUrl from "@/assets/letterhead-bg.png";

export interface ContentSection {
  heading?: string;
  body?: string;
  bullets?: string[];
  /** Optional image URL rendered as an attachment without exposing the signed URL as text. */
  imageUrl?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PdfTableData {
  columns: TableColumn[];
  rows: Record<string, string | number>[];
  summary?: { label: string; value: string }[];
}

interface PdfOptions {
  title: string;
  content?: string;
  contentSections?: ContentSection[];
  tableData?: PdfTableData;
  stampType?: "hr" | "finance" | "admin" | "general" | null;
  showSignature?: boolean;
  senderName?: string;
  senderDepartment?: string;
  documentId?: string;
  companyName?: string;
  logoUrl?: string | null;
  /** Optional diagonal watermark drawn on every page (e.g. "DRAFT", "FINAL", "COPY"). */
  watermark?: string | null;
  /** Use a small paper format for genuinely short documents such as receipts. */
  compact?: boolean;
  /** Override adaptive sizing when a document’s table width requires a specific paper format. */
  paperSize?: "a4" | "a5";
}

const stampLabels: Record<string, string> = {
  hr: "HR APPROVED",
  finance: "FINANCE VERIFIED",
  admin: "ADMIN APPROVED",
  general: "COMPANY SEAL",
};

const stripMd = (text: string): string =>
  text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/>\s?/g, "")
    .replace(/- \[[ x]\]\s?/gi, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Fallback company name used in the circular stamp. Callers that have the
// organization record should pass options.companyName so multi-organization
// documents carry the right name (see generateWaybill).
const COMPANY = "NIF Technical Services";
const GREEN: [number, number, number] = [18, 139, 72];
const BLUE: [number, number, number] = [10, 37, 92];
const DARK: [number, number, number] = [17, 29, 45];
const SLATE: [number, number, number] = [91, 103, 115];
const LIGHT_GREEN: [number, number, number] = [241, 249, 243];
const STAMP_RED: [number, number, number] = [180, 30, 30];
const CONTENT_TOP_START = 88;
const CONTENT_BOTTOM_RESERVE = 30;

// Cached promise: fetch the bundled letterhead asset once and reuse the data URL.
let letterheadDataUrlPromise: Promise<string | null> | null = null;
function getLetterheadDataUrl(): Promise<string | null> {
  if (!letterheadDataUrlPromise) {
    letterheadDataUrlPromise = fetch(letterheadBgUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("letterhead fetch failed"))))
      .then(
        (blob) =>
          new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return letterheadDataUrlPromise;
}

function drawLetterheadBackground(doc: jsPDF, dataUrl: string | null) {
  if (!dataUrl) return;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  try {
    doc.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
  } catch {
    /* ignore — content still renders without background */
  }
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, margin: number, contentTop = CONTENT_TOP_START, contentBottom = CONTENT_BOTTOM_RESERVE, letterheadDataUrl: string | null = null): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - contentBottom) {
    doc.addPage();
    drawPageChrome(doc, letterheadDataUrl);
    return contentTop;
  }
  return y;
}

function drawPageChrome(doc: jsPDF, letterheadDataUrl: string | null = null) {
  drawLetterheadBackground(doc, letterheadDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.35);
  doc.line(18, pageH - 20, pageW - 18, pageH - 20);
}

function drawCircularStamp(doc: jsPDF, x: number, y: number, stampType: string, companyName?: string) {
  const radius = 18;
  const label = stampLabels[stampType] || "APPROVED";
  const companyLabel = companyName || COMPANY;

  doc.setDrawColor(...STAMP_RED);
  doc.setLineWidth(1.2);
  doc.circle(x, y, radius);
  doc.setLineWidth(0.5);
  doc.circle(x, y, radius - 2.5);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAMP_RED);
  doc.text(companyLabel.toUpperCase(), x, y - radius + 6, { align: "center" });

  doc.setDrawColor(...STAMP_RED);
  doc.setLineWidth(0.3);
  doc.line(x - 12, y - 5, x + 12, y - 5);
  doc.line(x - 12, y + 5, x + 12, y + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAMP_RED);
  doc.text(label, x, y + 1.5, { align: "center" });

  const dateStr = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, x, y + 10, { align: "center" });

  doc.setFontSize(6);
  doc.text("*", x - 14, y + 1.5, { align: "center" });
  doc.text("*", x + 14, y + 1.5, { align: "center" });
}

function parseContentIntoSections(content: string): ContentSection[] {
  const clean = stripMd(content);
  const lines = clean.split("\n");
  const sections: ContentSection[] = [];
  let currentSection: ContentSection = {};
  let currentBullets: string[] = [];
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (bodyLines.length > 0) currentSection.body = bodyLines.join("\n");
    if (currentBullets.length > 0) currentSection.bullets = [...currentBullets];
    if (currentSection.heading || currentSection.body || currentSection.bullets) sections.push({ ...currentSection });
    currentSection = {};
    bodyLines = [];
    currentBullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isHeading = (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed)) ||
      (trimmed.endsWith(":") && trimmed.length < 60);
    if (isHeading) {
      flushSection();
      currentSection.heading = trimmed.replace(/:$/, "");
    } else if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentBullets.push(trimmed.replace(/^[•\-*]\s*/, ""));
    } else {
      bodyLines.push(trimmed);
    }
  }
  flushSection();
  return sections.length > 0 ? sections : [{ body: clean }];
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePdf(options: PdfOptions): Promise<void> {
  const {
    title, content, contentSections, tableData, stampType,
    showSignature = true, senderName, senderDepartment, documentId, companyName, logoUrl, watermark,
  } = options;

  // Client-side generation only — server-side queue table is not configured.

  let logoData: string | null = null;
  if (logoUrl) logoData = await loadImageAsBase64(logoUrl);

  const sections = contentSections || (content ? parseContentIntoSections(content) : []);
  const sectionTextLength = sections.reduce((total, section) => total + (section.body?.length ?? 0) + (section.bullets?.join(" ").length ?? 0), 0);
  const isCompactDocument = options.paperSize
    ? options.paperSize === "a5"
    : Boolean(
      options.compact ||
      (tableData && tableData.rows.length <= 8 && sections.length <= 1 && sectionTextLength < 700),
    );
  // Short invoices and similar detailed records need an A4 canvas, but not the
  // generous spacing used by long reports. This keeps the table, totals, and
  // approvals together without shrinking a genuinely detailed document.
  const isDenseDocument = Boolean(
    tableData && !isCompactDocument && tableData.rows.length <= 3 && sections.length <= 3 &&
    sectionTextLength < 1200 && (tableData.summary?.length ?? 0) <= 10 &&
    !sections.some((section) => /attach|proof|verification/i.test(section.heading ?? "")),
  );
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: options.paperSize ?? (isCompactDocument ? "a5" : "a4") });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = isCompactDocument ? 12 : isDenseDocument ? 18 : 20;
  const contentW = pageW - margin * 2;
  // The compact A5 letterhead includes a contact strip through roughly 60 mm;
  // keep document metadata below it so IDs never collide with the company details.
  const contentTop = isCompactDocument ? 64 : isDenseDocument ? 68 : CONTENT_TOP_START;
  const contentBottom = isCompactDocument ? 18 : isDenseDocument ? 22 : CONTENT_BOTTOM_RESERVE;
  const pdfText = (value: string | number) => String(value).replace(/₦/g, "NGN ").replace(/★/g, "*");

  const letterheadDataUrl = await getLetterheadDataUrl();
  drawPageChrome(doc, letterheadDataUrl);
  let y = contentTop;

  // Structured document header: predictable metadata first, then a strong title hierarchy.
  const docId = documentId || `DOC-${Date.now().toString(36).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`DOCUMENT ID  ${docId}`, margin, y);
  doc.text(`ISSUED  ${printDate}`, pageW - margin, y, { align: "right" });
  y += 8;

  const titleBoxHeight = isCompactDocument ? 24 : isDenseDocument ? 20 : 24;
  doc.setFillColor(...LIGHT_GREEN);
  doc.roundedRect(margin, y - 4, contentW, titleBoxHeight, 2, 2, "F");
  doc.setFillColor(...GREEN);
  doc.roundedRect(margin, y - 4, 3.5, titleBoxHeight, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isCompactDocument ? 12 : isDenseDocument ? 15 : 18);
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(pdfText(title.toUpperCase()), contentW - 22);
  doc.text(titleLines[0], margin + 10, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(companyName || COMPANY, margin + 10, y + (isDenseDocument ? 12 : 14));
  if (watermark) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GREEN);
    doc.text(String(watermark).toUpperCase(), pageW - margin - 8, y + 7, { align: "right" });
  }
  if (stampType && isCompactDocument) {
    const badgeLabel = stampLabels[stampType] || "APPROVED";
    const badgeW = Math.min(52, contentW * 0.34);
    const badgeX = pageW - margin - badgeW - 2;
    const badgeY = y + 10;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...GREEN);
    doc.roundedRect(badgeX, badgeY, badgeW, 8, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...GREEN);
    doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 5, { align: "center" });
  }
  y += isCompactDocument ? 31 : isDenseDocument ? 25 : 31;

  if ((senderName || senderDepartment) && !isDenseDocument) {
    doc.setDrawColor(220, 230, 224);
    doc.setFillColor(252, 253, 252);
    doc.roundedRect(margin, y - 3, contentW, 14, 1.5, 1.5, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    let sy = y + 3;
    if (senderName) { doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK); doc.text(senderName, margin + 5, sy); sy += 4; }
    if (senderDepartment) { doc.setFont("helvetica", "normal"); doc.setTextColor(...SLATE); doc.text(senderDepartment, margin + 5, sy); }
    y += 20;
  }

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.55);
  doc.line(margin, y, margin + 30, y);
  y += isDenseDocument ? 5 : 8;

  // Content sections. Dense short records use two columns so invoice metadata
  // does not push a small line-item table onto a second page.
  if (isDenseDocument) {
    const columnGap = 10;
    const columnWidth = (contentW - columnGap) / 2;
    const columnY = [y, y];
    sections.forEach((section, sectionIndex) => {
      const column = sectionIndex % 2;
      let columnCursor = columnY[column];
      if (section.heading) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK);
        doc.text(pdfText(section.heading), margin + column * (columnWidth + columnGap), columnCursor);
        columnCursor += 5;
      }
      const lines = [
        ...(section.body ? [section.body] : []),
        ...(section.bullets ?? []),
      ];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(45, 45, 45);
      for (const line of lines) {
        const wrapped = doc.splitTextToSize(pdfText(line), columnWidth - 2);
        for (const wrappedLine of wrapped) {
          columnCursor = checkPageBreak(doc, columnCursor, 4.5, margin, contentTop, contentBottom, letterheadDataUrl);
          doc.text(pdfText(wrappedLine), margin + column * (columnWidth + columnGap), columnCursor);
          columnCursor += 3.8;
        }
      }
      columnY[column] = columnCursor + 2;
    });
    y = Math.max(...columnY) + 2;
  } else {
  // Content sections
  for (const section of sections) {
    if (section.heading) {
      y = checkPageBreak(doc, y, 12, margin, contentTop, contentBottom, letterheadDataUrl);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(section.heading, margin, y);
      y += 6;
    }
    if (section.body && !section.imageUrl) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(pdfText(section.body), contentW);
      for (const line of lines) {
        y = checkPageBreak(doc, y, 6, margin, contentTop, contentBottom, letterheadDataUrl);
        doc.text(pdfText(line), margin, y);
        y += 5;
      }
      y += 2;
    }
    // Embed any image URL found in attachment / proof / verification sections.
    if (
      section.heading &&
      /attach|proof|verification|image/i.test(section.heading) &&
      (section.imageUrl || section.body)
    ) {
      const imgUrl = section.imageUrl ?? section.body?.match(/https?:\/\/[^\s)]+/)?.[0];
      if (imgUrl && /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(imgUrl)) {
        const imgData = await loadImageAsBase64(imgUrl);
        if (imgData) {
          // Use natural aspect ratio when possible
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const im = new Image();
            im.onload = () => resolve({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 });
            im.onerror = () => resolve({ w: 4, h: 3 });
            im.src = imgData;
          });
          const maxW = contentW;
          const maxH = 110;
          let imgW = maxW;
          let imgH = (imgW * dims.h) / dims.w;
          if (imgH > maxH) {
            imgH = maxH;
            imgW = (imgH * dims.w) / dims.h;
          }
          y = checkPageBreak(doc, y, imgH + 6, margin, contentTop, contentBottom, letterheadDataUrl);
          try {
            const fmt = /\.png(\?.*)?$/i.test(imgUrl) ? "PNG" : "JPEG";
            doc.addImage(imgData, fmt, margin, y, imgW, imgH);
            y += imgH + 6;
          } catch {
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text("[Attachment image could not be embedded]", margin, y);
            y += 8;
          }
        }
      }
    }
    if (section.bullets && section.bullets.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      for (const bullet of section.bullets) {
        y = checkPageBreak(doc, y, 6, margin, contentTop, contentBottom, letterheadDataUrl);
        doc.setFillColor(...GREEN);
        doc.circle(margin + 1.5, y - 1.2, 0.8, "F");
        const bulletLines = doc.splitTextToSize(pdfText(bullet), contentW - 8);
        for (let i = 0; i < bulletLines.length; i++) {
          if (i > 0) y = checkPageBreak(doc, y, 5, margin, contentTop, contentBottom, letterheadDataUrl);
          doc.text(pdfText(bulletLines[i]), margin + 5, y);
          y += 4.5;
        }
      }
      y += 3;
    }
  }
  }

  // Table data
  if (tableData) {
    y = checkPageBreak(doc, y, 30, margin, contentTop, contentBottom, letterheadDataUrl);
    autoTable(doc, {
      startY: y,
      head: [tableData.columns.map(c => pdfText(c.header))],
      body: tableData.rows.map(row => tableData.columns.map(c => pdfText(row[c.dataKey] ?? ""))),
      margin: { top: contentTop, right: margin, bottom: contentBottom, left: margin },
      styles: { font: "helvetica", fontSize: isCompactDocument ? 7.3 : isDenseDocument ? 7.5 : 8.3, cellPadding: isCompactDocument ? { top: 1.6, right: 2, bottom: 1.6, left: 2 } : isDenseDocument ? { top: 1.8, right: 2.5, bottom: 1.8, left: 2.5 } : { top: 2.7, right: 3, bottom: 2.7, left: 3 }, textColor: [35, 45, 55], lineColor: [218, 226, 221], lineWidth: 0.18, valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: BLUE as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold", fontSize: isCompactDocument ? 7.2 : isDenseDocument ? 7.4 : 8.2, halign: "left", lineColor: BLUE as [number, number, number] },
      alternateRowStyles: { fillColor: LIGHT_GREEN as [number, number, number] },
      bodyStyles: { minCellHeight: isCompactDocument ? 5.6 : isDenseDocument ? 6 : 8 },
      columnStyles: Object.fromEntries(tableData.columns.map((column, index) => [index, { cellWidth: column.width ?? "auto" }])),
      theme: "grid",
      willDrawPage: ({ doc: tableDoc }) => {
        drawPageChrome(tableDoc, letterheadDataUrl);
      },
    });
    // @ts-expect-error - autoTable adds lastAutoTable to jsPDF instance
    y = doc.lastAutoTable?.finalY ?? y + 10;
    y += 4;

    if (tableData.summary) {
      const summaryLineHeight = isCompactDocument ? 4.8 : isDenseDocument ? 4.8 : 6;
      const summaryHeight = Math.max(isCompactDocument ? 12 : isDenseDocument ? 14 : 16, tableData.summary.length * summaryLineHeight + (isCompactDocument ? 5 : isDenseDocument ? 6 : 8));
      y = checkPageBreak(doc, y, summaryHeight, margin, contentTop, contentBottom, letterheadDataUrl);
      const boxX = pageW - margin - 82;
      doc.setFillColor(248, 251, 249);
      doc.setDrawColor(220, 230, 224);
      doc.roundedRect(boxX, y - 4, 82, summaryHeight, 1.5, 1.5, "FD");
      doc.setFillColor(...GREEN);
      doc.roundedRect(boxX, y - 4, 2.5, summaryHeight, 1, 1, "F");
      y += 2;
      for (const item of tableData.summary) {
        doc.setFontSize(item.label.toLowerCase().includes("grand") || item.label.toLowerCase().includes("total amount") ? (isDenseDocument ? 8.5 : 9.5) : (isDenseDocument ? 7.5 : 8.5));
        doc.setFont("helvetica", item.label.toLowerCase().includes("grand") || item.label.toLowerCase().includes("total") ? "bold" : "normal");
        doc.setTextColor(...(item.label.toLowerCase().includes("grand") || item.label.toLowerCase().includes("total amount") ? DARK : SLATE));
        doc.text(pdfText(item.label), boxX + 7, y);
        doc.text(pdfText(item.value), pageW - margin - 5, y, { align: "right" });
        y += summaryLineHeight;
      }
      y += isDenseDocument ? 3 : 5;
    }
  }

  // Signature block
  if (showSignature) {
    const sigBlockHeight = isDenseDocument ? 16 : 20;
    if (y + sigBlockHeight + 18 > pageH - contentBottom) {
      if (isCompactDocument) {
        // Compact allocation sheets have a deliberate lower whitespace reserve;
        // use it for approvals instead of creating a mostly blank second page.
        y = pageH - contentBottom - sigBlockHeight - 4;
      } else {
        doc.addPage();
        drawPageChrome(doc, letterheadDataUrl);
        y = contentTop;
      }
    }
    y = Math.min(y + (isDenseDocument ? 6 : 10), pageH - contentBottom - 14);
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);
    const sigW = contentW / 3 - 10;
    ["Prepared By", "Approved By", "Date"].forEach((label, i) => {
      const x = margin + i * (sigW + 15);
      doc.line(x, y, x + sigW, y);
      doc.setFontSize(isDenseDocument ? 6.2 : 7);
      doc.setTextColor(120, 120, 120);
      doc.text(label, x + sigW / 2, y + 4, { align: "center" });
    });
    y += isDenseDocument ? 8 : 10;
  }

  // Stamp
  if (stampType && !isCompactDocument) {
    const stampX = pageW - margin - 20;
    const stampY = Math.min(y + (isDenseDocument ? 3 : 5), pageH - contentBottom - 16);
    drawCircularStamp(doc, stampX, stampY, stampType, options.companyName);
    y = stampY + 22;
  }

  // Continuation headers & footer styling
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Quiet footer metadata remains legible in print and does not compete with the document.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(pdfText(`${companyName || COMPANY}  •  ${docId}`), margin, pageH - (isCompactDocument ? 13 : 23));
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - (isCompactDocument ? 13 : 23), { align: "right" });

    // Optional diagonal watermark (DRAFT / FINAL / COPY etc.).
    if (watermark) {
      const label = String(watermark).toUpperCase();
      const isFinal = label === "FINAL";
      const tint: [number, number, number] = isFinal ? [40, 140, 70] : [200, 60, 60];
      const anyDoc = doc as unknown as {
        saveGraphicsState?: () => void;
        restoreGraphicsState?: () => void;
        GState?: new (opts: { opacity: number }) => unknown;
        setGState?: (gs: unknown) => void;
      };
      anyDoc.saveGraphicsState?.();
      const gs = anyDoc.GState ? new anyDoc.GState({ opacity: 0.12 }) : null;
      if (gs && anyDoc.setGState) anyDoc.setGState(gs);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(90);
      doc.setTextColor(...tint);
      doc.text(label, pageW / 2, pageH / 2, { align: "center", angle: 45, baseline: "middle" });
      anyDoc.restoreGraphicsState?.();
      // Reset text colour for any subsequent draw on this page.
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${docId}.pdf`);
}

export { stripMd as cleanForPrint };