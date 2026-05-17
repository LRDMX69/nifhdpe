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
  // ============================================================
  // 1. TOP COLORFUL GEOMETRIC BANNERS (Matching Reference Image)
  // ============================================================
  
  // Green banner on top left/center
  doc.setFillColor(...GREEN);
  doc.triangle(0, 0, 130, 0, 0, 52, "F");

  // Blue banner parallel diagonal strip below Green
  doc.setFillColor(...BLUE);
  doc.triangle(0, 52, 130, 0, 175, 0, "F");
  doc.triangle(0, 52, 175, 0, 0, 68, "F");

  // ============================================================
  // 2. COMPANY LOGO / GRID MODERN ICON (Top-Right White Area)
  // ============================================================
  const logoX = 145;
  const logoY = 10;
  
  // Custom composite modern tech grid logo (grid structure)
  doc.setFillColor(...BLUE);
  doc.rect(logoX, logoY, 4.5, 4.5, "F");
  doc.rect(logoX + 10.6, logoY, 4.5, 4.5, "F");
  doc.rect(logoX + 15.9, logoY, 4.5, 4.5, "F");
  doc.rect(logoX, logoY + 5.3, 4.5, 4.5, "F");
  doc.rect(logoX + 10.6, logoY + 5.3, 4.5, 4.5, "F");
  
  doc.setFillColor(...GREEN);
  doc.rect(logoX + 5.3, logoY, 4.5, 4.5, "F");
  doc.rect(logoX + 5.3, logoY + 5.3, 4.5, 4.5, "F");
  doc.rect(logoX, logoY + 10.6, 4.5, 4.5, "F");
  doc.rect(logoX + 5.3, logoY + 10.6, 4.5, 4.5, "F");
  doc.rect(logoX + 10.6, logoY + 10.6, 4.5, 4.5, "F");
  doc.rect(logoX + 15.9, logoY + 10.6, 4.5, 4.5, "F");

  // Label text under logo block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  doc.text("NIF TECHNICAL SERVICES LTD.", 190, 29, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text("RC: 1872934 | PIPING SPECIALISTS", 190, 32.5, { align: "right" });

  // ============================================================
  // 3. COMPANY CONTACT DETAILS (Left Side, under polygons)
  // ============================================================
  const detailsY = 48;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  // Helper function to draw circular check-dot icon next to details
  const drawIcon = (x: number, y: number) => {
    doc.setFillColor(...GREEN);
    doc.circle(x, y, 1.2, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(x, y, 0.4, "F");
  };

  // Row 1: Address
  drawIcon(22, detailsY + 2.5);
  doc.setFont("helvetica", "bold");
  doc.text("Head Office Address:", 27, detailsY + 1.5);
  doc.setFont("helvetica", "normal");
  doc.text("No. 15 Industrial Layout, Trans-Amadi, Port Harcourt, Rivers State, Nigeria.", 27, detailsY + 4.5);
  
  // Row 2: Phone
  drawIcon(22, detailsY + 12);
  doc.setFont("helvetica", "bold");
  doc.text("Contact Support Lines:", 27, detailsY + 11);
  doc.setFont("helvetica", "normal");
  doc.text("+234 803 123 4567, +234 809 876 5432", 27, detailsY + 14);

  // Row 3: Email & Web
  drawIcon(22, detailsY + 21.5);
  doc.setFont("helvetica", "bold");
  doc.text("Digital Channels:", 27, detailsY + 20.5);
  doc.setFont("helvetica", "normal");
  doc.text("info@niftechnical.com   |   www.nifhdpe.com", 27, detailsY + 23.5);

  // Underline detail separators in light gray (Matching Reference Image)
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(20, detailsY + 6.5, 120, detailsY + 6.5);
  doc.line(20, detailsY + 16, 120, detailsY + 16);
  doc.line(20, detailsY + 25.5, 120, detailsY + 25.5);

  // Green bottom underline bounding the letterhead area
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(margin, detailsY + 29.5, pageW - margin, detailsY + 29.5);

  return detailsY + 36; // Returns content top boundary (~84mm)
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

  // Client-side generation only — server-side queue table is not configured.

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
    // Embed any image URL found in attachment / proof / verification sections.
    if (
      section.heading &&
      /attach|proof|verification|image/i.test(section.heading) &&
      section.body
    ) {
      const urlMatch = section.body.match(/https?:\/\/[^\s)]+/);
      if (urlMatch && /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(urlMatch[0])) {
        const imgUrl = urlMatch[0];
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
          y = checkPageBreak(doc, y, imgH + 6, margin);
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
      headStyles: { fillColor: BLUE as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      theme: "grid",
    });
    // @ts-expect-error - autoTable adds lastAutoTable to jsPDF instance
    y = doc.lastAutoTable?.finalY ?? y + 10;
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

  // Continuation headers & footer styling
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw top header separator for pages 2+
    if (i > 1) drawContinuationHeader(doc, margin, pageW, i, pageCount);

    // ============================================================
    // 4. WATERMARK & FOOTER STYLING (Matching Reference Image)
    // ============================================================
    
    // Draw background pipe watermark (very light gray, 246, 246, 246)
    doc.setDrawColor(246, 246, 246);
    doc.setLineWidth(1.5);
    doc.circle(165, 235, 25);
    doc.circle(165, 235, 18);
    doc.setLineWidth(4);
    doc.line(140, 245, 190, 225); // diagonal pipe segment
    doc.line(143, 248, 193, 228);

    // Draw bottom green divider line running across margin to the corner block
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.6);
    doc.line(margin, pageH - 20, pageW - 40, pageH - 20);

    // Draw bottom right blue diagonal corner block
    doc.setFillColor(...BLUE);
    doc.triangle(pageW, pageH, pageW - 35, pageH, pageW, pageH - 18, "F");

    // Footnotes and page count
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by NIF Technical Services System — ${new Date().toLocaleDateString("en-NG")}`, margin, pageH - 14);
    doc.text(`Page ${i} of ${pageCount}`, margin, pageH - 10);
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${docId}.pdf`);
}

export { stripMd as cleanForPrint };