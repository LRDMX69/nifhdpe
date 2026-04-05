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
}

const stampLabels: Record<string, string> = {
  hr: "HR APPROVED",
  finance: "FINANCE VERIFIED",
  admin: "ADMIN APPROVED",
  general: "COMPANY SEAL",
};

/** Strip markdown for clean PDF output */
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
const CONTACT = "Lagos, Nigeria | info@nifhdpe.com | +234 XXX XXX XXXX";
const GREEN: [number, number, number] = [63, 167, 68];
const DARK: [number, number, number] = [10, 22, 40];
const STAMP_RED: [number, number, number] = [180, 30, 30];

function drawLetterhead(doc: jsPDF, margin: number, pageW: number): number {
  let y = margin;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(COMPANY, margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(TAGLINE, margin, y);
  y += 3.5;
  doc.text(CONTACT, margin, y);
  y += 2;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;
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
    return 18; // will be updated in final pass
  }
  return y;
}

/** Draw a professional circular company stamp */
function drawCircularStamp(doc: jsPDF, x: number, y: number, stampType: string) {
  const radius = 18;
  const label = stampLabels[stampType] || "APPROVED";
  const cx = x;
  const cy = y;

  // Semi-transparent effect via lighter color
  doc.setDrawColor(...STAMP_RED);
  doc.setLineWidth(1.2);
  doc.circle(cx, cy, radius);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, radius - 2.5);

  // Company name curved along top (simplified as straight text)
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAMP_RED);
  doc.text(COMPANY.toUpperCase(), cx, cy - radius + 6, { align: "center" });

  // Divider lines
  doc.setDrawColor(...STAMP_RED);
  doc.setLineWidth(0.3);
  doc.line(cx - 12, cy - 5, cx + 12, cy - 5);
  doc.line(cx - 12, cy + 5, cx + 12, cy + 5);

  // Approval text center
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAMP_RED);
  doc.text(label, cx, cy + 1.5, { align: "center" });

  // Date along bottom
  const dateStr = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, cx, cy + 10, { align: "center" });

  // Star decorations
  doc.setFontSize(6);
  doc.text("★", cx - 14, cy + 1.5, { align: "center" });
  doc.text("★", cx + 14, cy + 1.5, { align: "center" });
}

/** Parse flat content into structured sections */
function parseContentIntoSections(content: string): ContentSection[] {
  const clean = stripMd(content);
  const lines = clean.split("\n");
  const sections: ContentSection[] = [];
  let currentSection: ContentSection = {};
  let currentBullets: string[] = [];
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (bodyLines.length > 0) {
      currentSection.body = bodyLines.join("\n");
    }
    if (currentBullets.length > 0) {
      currentSection.bullets = [...currentBullets];
    }
    if (currentSection.heading || currentSection.body || currentSection.bullets) {
      sections.push({ ...currentSection });
    }
    currentSection = {};
    bodyLines = [];
    currentBullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headings: ALL CAPS lines, or lines ending with ":"
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

export function generatePdf(options: PdfOptions): void {
  const {
    title,
    content,
    contentSections,
    tableData,
    stampType,
    showSignature = true,
    senderName,
    senderDepartment,
    documentId,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  let y = drawLetterhead(doc, margin, pageW);

  // --- DOC META ---
  const docId = documentId || `DOC-${Date.now().toString(36).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Document ID: ${docId}`, margin, y);
  doc.text(`Date: ${printDate}`, pageW - margin, y, { align: "right" });
  y += 7;

  // --- SENDER INFO ---
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

  // --- TITLE ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(title, margin, y);
  y += 3;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 40, y);
  y += 8;

  // --- CONTENT SECTIONS ---
  const sections = contentSections || (content ? parseContentIntoSections(content) : []);

  for (const section of sections) {
    // Heading
    if (section.heading) {
      y = checkPageBreak(doc, y, 12, margin);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(section.heading, margin, y);
      y += 6;
    }

    // Body text
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

    // Bullets
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

  // --- TABLE DATA ---
  if (tableData) {
    y = checkPageBreak(doc, y, 30, margin);
    autoTable(doc, {
      startY: y,
      head: [tableData.columns.map(c => c.header)],
      body: tableData.rows.map(row => tableData.columns.map(c => String(row[c.dataKey] ?? ""))),
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: DARK,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 4;

    // Summary rows below table
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

  // --- SIGNATURE BLOCK ---
  if (showSignature) {
    const sigBlockHeight = 20;
    // Ensure sig block is at bottom of last page or on new page
    if (y + sigBlockHeight + 30 > pageH) {
      doc.addPage();
      y = 30;
    }
    y = Math.max(y + 15, pageH - 45);

    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);
    const sigW = contentW / 3 - 10;
    const labels = ["Prepared By", "Approved By", "Date"];
    labels.forEach((label, i) => {
      const x = margin + i * (sigW + 15);
      doc.line(x, y, x + sigW, y);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(label, x + sigW / 2, y + 4, { align: "center" });
    });
    y += 10;
  }

  // --- STAMP ---
  if (stampType) {
    const stampX = pageW - margin - 20;
    const stampY = Math.min(y + 5, pageH - 30);
    drawCircularStamp(doc, stampX, stampY, stampType);
    y = stampY + 22;
  }

  // --- WATERMARK & CONTINUATION HEADERS ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Continuation header on pages 2+
    if (i > 1) {
      drawContinuationHeader(doc, margin, pageW, i, pageCount);
    }
    // Footer watermark
    doc.setFontSize(6);
    doc.setTextColor(200, 200, 200);
    doc.text(
      `Generated by NIF Technical Services System — ${new Date().toISOString()}`,
      pageW - margin, pageH - 8, { align: "right" }
    );
    doc.text(`Page ${i} of ${pageCount}`, margin, pageH - 8);
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${docId}.pdf`);
}

export { stripMd as cleanForPrint };
