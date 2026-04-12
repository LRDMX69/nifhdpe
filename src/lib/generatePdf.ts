import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ContentSection {
  heading?: string;
  body?: string;
  bullets?: string[];
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

const COMPANY = "NIF Technical Services";
const TAGLINE = "HDPE Pipe Infrastructure Specialists";
const CONTACT = "Lagos, Nigeria | info@nifhdpe.com | +234 800 000 0000"; // Fixed placeholder
const GREEN: [number, number, number] = [63, 167, 68];
const BLUE: [number, number, number] = [10, 22, 40]; // Using DARK as BLUE
const DARK: [number, number, number] = [10, 22, 40];
const STAMP_RED: [number, number, number] = [180, 30, 30];

function drawLetterhead(doc: jsPDF, margin: number, pageW: number): number {
  // 1. Draw Geometric Banner Background (Horizontal Rectangle Banner at TOP CENTER)
  const bannerW = pageW * 0.7;
  const bannerH = 22;
  const bannerX = (pageW - bannerW) / 2;
  const bannerY = 8;
  const cutDepth = bannerW * 0.55; // Slightly more than half depth for the diagonal cut

  // The split and cut follow the same diagonal line
  // LEFT side (BLUE)
  doc.setFillColor(...BLUE);
  doc.path([
    { op: "m", c: [bannerX, bannerY] },
    { op: "l", c: [bannerX + (bannerW * 0.6), bannerY] }, // Split point at top
    { op: "l", c: [bannerX + (bannerW * 0.6) - 20, bannerY + bannerH] }, // Split point at bottom (diagonal)
    { op: "l", c: [bannerX, bannerY + bannerH] },
    { op: "h", c: [] }
  ], "F");

  // RIGHT side (GREEN)
  doc.setFillColor(...GREEN);
  doc.path([
    { op: "m", c: [bannerX + (bannerW * 0.6), bannerY] }, // Top split point
    { op: "l", c: [bannerX + bannerW, bannerY] }, // Top-right
    { op: "l", c: [bannerX + bannerW - cutDepth, bannerY + bannerH] }, // BOTTOM-RIGHT CUT INWARD DIAGONALLY
    { op: "l", c: [bannerX + (bannerW * 0.6) - 20, bannerY + bannerH] }, // Bottom split point
    { op: "h", c: [] }
  ], "F");

  // 2. Logo + Header Layout (Beside the rectangle, not inside)
  let y = margin + 5;
  // Placeholder for Logo (Top-Left)
  doc.setFillColor(...BLUE);
  doc.rect(margin, y - 5, 12, 12, "F"); // Logo box
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("NIF", margin + 2, y + 2);

  // Company Name beside it
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(COMPANY, margin + 15, y);
  
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(TAGLINE, margin + 15, y);
  
  y += 4;
  doc.text(CONTACT, margin + 15, y);
  
  y += 5;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 10;
  return y;
}

function drawContinuationHeader(doc: jsPDF, margin: number, pageW: number, pageNum: number, totalPages: number): number {
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text(COMPANY, margin, 10);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, 10, { align: "right" });
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, 12, pageW - margin, 12);
  return 18;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawCircularStamp(doc: jsPDF, x: number, y: number, stampType: string) {
  const radius = 18;
  const label = stampLabels[stampType] || "APPROVED";

  doc.setDrawColor(...STAMP_RED);
  doc.setLineWidth(1.2);
  doc.circle(x, y, radius);
  doc.setLineWidth(0.5);
  doc.circle(x, y, radius - 2.5);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAMP_RED);
  doc.text(COMPANY.toUpperCase(), x, y - radius + 6, { align: "center" });

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
  doc.text("★", x - 14, y + 1.5, { align: "center" });
  doc.text("★", x + 14, y + 1.5, { align: "center" });
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
    showSignature = true, senderName, senderDepartment, documentId, logoUrl,
  } = options;

  // Try server-side enqueue first to avoid heavy client work.
  try {
    const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
    const SUPABASE_PUB = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (SUPABASE_URL && SUPABASE_PUB) {
      const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUB}`,
        },
        body: JSON.stringify({ title, content, contentSections, tableData, stampType, showSignature, senderName, senderDepartment, documentId, logoUrl }),
      });
      if (resp.ok) {
        // Job queued; return so client doesn't do heavy PDF work.
        return;
      }
    }
  } catch (e) {
    // Best-effort: if server enqueue fails, continue with client generation
  }

  let logoData: string | null = null;
  if (logoUrl) logoData = await loadImageAsBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Branded header banner
  let y = drawLetterhead(doc, margin, pageW);

  // Doc meta
  const docId = documentId || `DOC-${Date.now().toString(36).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Document ID: ${docId}`, margin, y);
  doc.text(`Date: ${printDate}`, pageW - margin, y, { align: "right" });
  y += 7;

  // Sender info
  if (senderName || senderDepartment) {
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 1, margin, y + 10);
    doc.setFillColor(249, 249, 249);
    doc.rect(margin + 1, y - 1, contentW - 1, 12, "F");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    let sy = y + 3;
    if (senderName) { doc.text(`Prepared by: ${senderName}`, margin + 4, sy); sy += 4; }
    if (senderDepartment) { doc.text(`Department: ${senderDepartment}`, margin + 4, sy); }
    y += 16;
  }

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(title, margin, y);
  y += 3;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 40, y);
  y += 8;

  // Content sections
  const sections = contentSections || (content ? parseContentIntoSections(content) : []);

  for (const section of sections) {
    if (section.heading) {
      y = checkPageBreak(doc, y, 12, margin);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(section.heading, margin, y);
      y += 6;
    }
    if (section.body) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(section.body, contentW);
      for (const line of lines) {
        y = checkPageBreak(doc, y, 6, margin);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 2;
    }
    // If this section is an attachment and contains a URL, try to embed the image
    if (section.heading && section.heading.toLowerCase().includes("attach") && section.body) {
      const urlMatch = section.body.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        const imgUrl = urlMatch[0];
        const imgData = await loadImageAsBase64(imgUrl);
        if (imgData) {
          y = checkPageBreak(doc, y, 40, margin);
          // Fit image width to half content width
          const imgW = Math.min(contentW / 2, 120);
          const imgH = (imgW / 1.6);
          try {
            doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
            y += imgH + 6;
          } catch (e) {
            // fallback: add a note
            doc.setFontSize(9);
            doc.text("[Attachment could not be embedded]", margin, y);
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
        y = checkPageBreak(doc, y, 6, margin);
        doc.setFillColor(...GREEN);
        doc.circle(margin + 1.5, y - 1.2, 0.8, "F");
        const bulletLines = doc.splitTextToSize(bullet, contentW - 8);
        for (let i = 0; i < bulletLines.length; i++) {
          if (i > 0) y = checkPageBreak(doc, y, 5, margin);
          doc.text(bulletLines[i], margin + 5, y);
          y += 4.5;
        }
      }
      y += 3;
    }
  }

  // Table data
  if (tableData) {
    y = checkPageBreak(doc, y, 30, margin);
    autoTable(doc, {
      startY: y,
      head: [tableData.columns.map(c => c.header)],
      body: tableData.rows.map(row => tableData.columns.map(c => String(row[c.dataKey] ?? ""))),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 30, 30], lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: BLUE as any, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 4;

    if (tableData.summary) {
      for (const item of tableData.summary) {
        y = checkPageBreak(doc, y, 7, margin);
        doc.setFontSize(9);
        doc.setFont("helvetica", item.label.toLowerCase().includes("total") ? "bold" : "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(item.label, pageW - margin - 80, y);
        doc.text(item.value, pageW - margin, y, { align: "right" });
        if (item.label.toLowerCase().includes("grand") || item.label.toLowerCase().includes("total amount")) {
          doc.setDrawColor(...GREEN);
          doc.setLineWidth(0.4);
          doc.line(pageW - margin - 80, y + 1.5, pageW - margin, y + 1.5);
        }
        y += 5.5;
      }
      y += 4;
    }
  }

  // Signature block
  if (showSignature) {
    const sigBlockHeight = 20;
    if (y + sigBlockHeight + 30 > pageH) { doc.addPage(); y = 30; }
    y = Math.max(y + 15, pageH - 45);
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);
    const sigW = contentW / 3 - 10;
    ["Prepared By", "Approved By", "Date"].forEach((label, i) => {
      const x = margin + i * (sigW + 15);
      doc.line(x, y, x + sigW, y);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(label, x + sigW / 2, y + 4, { align: "center" });
    });
    y += 10;
  }

  // Stamp
  if (stampType) {
    const stampX = pageW - margin - 20;
    const stampY = Math.min(y + 5, pageH - 30);
    drawCircularStamp(doc, stampX, stampY, stampType);
    y = stampY + 22;
  }

  // Continuation headers & footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) drawContinuationHeader(doc, margin, pageW, i, pageCount);
    doc.setFontSize(6);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated by NIF Technical Services System — ${new Date().toISOString()}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text(`Page ${i} of ${pageCount}`, margin, pageH - 8);
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${docId}.pdf`);
}

export { stripMd as cleanForPrint };