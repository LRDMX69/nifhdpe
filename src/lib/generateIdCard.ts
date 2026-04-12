import jsPDF from "jspdf";

interface IdCardOptions {
  employeeName: string;
  role: string;
  employeeNumber: string;
  organizationName: string;
  isTemporary: boolean;
  issueDate: string;
  expiryDate: string;
  avatarUrl?: string | null;
  phone?: string;
  emergencyContact?: string;
  logoUrl?: string | null;
}

const GREEN: [number, number, number] = [63, 167, 68];
const DARK: [number, number, number] = [10, 22, 40];
const WHITE: [number, number, number] = [255, 255, 255];

/** Truncate text to fit within max width */
function fitText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string {
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let t = text;
  while (doc.getTextWidth(t + "…") > maxWidth && t.length > 3) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function generateIdCard(options: IdCardOptions): Promise<void> {
  const {
    employeeName,
    role,
    employeeNumber,
    organizationName,
    isTemporary,
    issueDate,
    expiryDate,
    phone,
    emergencyContact,
    logoUrl,
  } = options;

  // Credit-card size landscape: 85.6mm x 54mm
  const w = 85.6;
  const h = 54;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [w, h] });

  // ============= FRONT SIDE =============

  // Dark background
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, h, "F");

  // Green accent bar at top
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, w, 2.5, "F");

  // Left green sidebar
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 2, h, "F");

  // Organization name area
  doc.setFillColor(20, 35, 55);
  doc.rect(2, 2.5, w - 2, 10, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(organizationName, 6, 9);

  // Organization logo (if available)
  if (logoUrl) {
    try {
      const logoImg = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            reject(new Error("Failed to get canvas context"));
          }
        };
        img.onerror = () => reject(new Error("Failed to load logo"));
        img.src = logoUrl;
      });
      // Add logo to the right side of the header area
      const logoSize = 7;
      doc.addImage(logoImg, "PNG", w - logoSize - 4, 3.5, logoSize, logoSize);
    } catch (e) {
      // ignore
    }
  }

  // Badge type
  if (isTemporary) {
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(56, 4, 26, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TEMPORARY", 69, 8, { align: "center" });
  } else {
    doc.setFillColor(...GREEN);
    doc.roundedRect(56, 4, 26, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("PERMANENT", 69, 8, { align: "center" });
  }

  // Photo placeholder area
  const photoX = 6;
  const photoY = 16;
  const photoW = 20;
  const photoH = 24;
  doc.setFillColor(35, 50, 70);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, "F");
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2);
  // Photo placeholder icon (camera silhouette using shapes)
  doc.setFillColor(60, 80, 100);
  doc.circle(photoX + photoW / 2, photoY + photoH / 2 - 1, 5, "F");
  doc.circle(photoX + photoW / 2, photoY + photoH / 2 - 4, 3.5, "F");
  doc.setFontSize(4.5);
  doc.setTextColor(100, 120, 140);
  doc.text("PHOTO", photoX + photoW / 2, photoY + photoH - 2, { align: "center" });

  // Employee name - auto-scale
  const displayName = fitText(doc, employeeName, 48, 11);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(displayName, 30, 22);

  // Role
  const displayRole = role.replace(/_/g, " ").toUpperCase();
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN);
  doc.text(displayRole, 30, 27);

  // Divider
  doc.setDrawColor(40, 60, 80);
  doc.setLineWidth(0.2);
  doc.line(30, 29, 78, 29);

  // Employee ID in monospace-like style
  doc.setFontSize(8);
  doc.setFont("courier", "bold");
  doc.setTextColor(160, 180, 200);
  doc.text(employeeNumber, 30, 34);

  // Bottom section
  doc.setFillColor(15, 28, 45);
  doc.rect(0, 42, w, 12, "F");

  // Green bottom accent
  doc.setFillColor(...GREEN);
  doc.rect(0, h - 2, w, 2, "F");

  // Dates
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 160, 180);
  doc.text(`ISSUED: ${issueDate}`, 6, 47);
  doc.text(`EXPIRES: ${expiryDate}`, 6, 50.5);

  // Barcode-style reference (deterministic pattern from employee number)
  const refCode = employeeNumber.replace(/[^A-Z0-9]/gi, "");
  const barStartX = 50;
  doc.setFillColor(...WHITE);
  for (let i = 0; i < Math.min(refCode.length * 2, 24); i++) {
    const charCode = refCode.charCodeAt(i % refCode.length);
    const bw = 0.6 + (charCode % 3) * 0.4;
    const bh = 6 + (charCode % 2);
    const gap = (charCode % 2 === 0) ? 0.3 : 0;
    if (gap === 0) {
      doc.rect(barStartX + i * 1.3, 44, bw, bh, "F");
    }
  }

  // Tiny reference below barcode
  doc.setFontSize(3.5);
  doc.setTextColor(100, 120, 140);
  doc.text(employeeNumber, barStartX + 12, 51.5, { align: "center" });

  // ============= BACK SIDE =============
  doc.addPage([w, h]);

  // Light background for back
  doc.setFillColor(240, 242, 245);
  doc.rect(0, 0, w, h, "F");

  // Top bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 8, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(organizationName, w / 2, 5.5, { align: "center" });

  // Terms & Conditions
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("TERMS & CONDITIONS", 5, 14);

  doc.setFontSize(4.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const terms = [
    "1. This card is property of the company and must be returned upon termination.",
    "2. The cardholder must carry this ID while on company premises or project sites.",
    "3. Report loss or theft immediately to the HR department.",
    "4. This card is non-transferable and must not be altered or defaced.",
    "5. Misuse of this card may result in disciplinary action.",
  ];
  let ty = 18;
  terms.forEach(t => {
    doc.text(t, 5, ty);
    ty += 3.5;
  });

  // Emergency Contact section
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(5, ty + 1, w - 5, ty + 1);
  ty += 4;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("EMERGENCY CONTACT", 5, ty);
  ty += 3.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(emergencyContact || "Contact: ________________________", 5, ty);
  ty += 3;
  doc.text(phone ? `Phone: ${phone}` : "Phone: ________________________", 5, ty);

  // Bottom section
  doc.setFillColor(...DARK);
  doc.rect(0, h - 8, w, 8, "F");
  doc.setFontSize(4);
  doc.setTextColor(120, 140, 160);
  doc.text("HDPE Pipe Infrastructure Specialists | Lagos, Nigeria", w / 2, h - 4.5, { align: "center" });
  doc.setTextColor(...GREEN);
  doc.setFontSize(4.5);
  doc.text(`ID: ${employeeNumber}`, w / 2, h - 2, { align: "center" });

  doc.save(`id-card-${employeeName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
