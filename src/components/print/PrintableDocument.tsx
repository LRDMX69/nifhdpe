import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PrintableDocumentProps {
  title: string;
  documentId?: string;
  children: ReactNode;
  stampType?: "hr" | "finance" | "admin" | "general" | null;
  showSignatureBlock?: boolean;
  senderName?: string;
  senderDepartment?: string;
  timestamp?: string;
}

/** Strip all markdown artifacts for clean professional output */
const stripMarkdown = (text: string): string =>
  text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/>\s?/g, "")
    .replace(/- \[[ x]\]\s?/gi, "")
    .replace(/^[-*+]\s/gm, "• ")
    .replace(/^\d+\.\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Extract text content from React children for PDF generation */
const extractTextFromChildren = (children: ReactNode): string => {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("\n");
  if (typeof children === "object" && "props" in (children as object)) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    if (props?.children) return extractTextFromChildren(props.children);
  }
  return "";
};

export const PrintableDocument = ({
  title, documentId, children, stampType, showSignatureBlock = true,
  senderName, senderDepartment, timestamp,
}: PrintableDocumentProps) => {
  const docId = documentId || `DOC-${Date.now().toString(36).toUpperCase()}`;

  const handlePrint = async () => {
    const { generatePdf } = await import("@/lib/generatePdf");
    const textContent = extractTextFromChildren(children);
    generatePdf({
      title,
      content: textContent,
      stampType: stampType ?? undefined,
      showSignature: showSignatureBlock,
      senderName,
      senderDepartment,
      documentId: docId,
    });
  };

  const handleDownload = async () => {
    // Same as print — generates PDF for download
    await handlePrint();
  };

  return (
    <div className="flex gap-2 print-hide">
      <Button size="sm" onClick={handlePrint}>
        Print PDF
      </Button>
      <Button size="sm" variant="outline" onClick={handleDownload}>
        Download
      </Button>
    </div>
  );
};

/** Utility: Strip markdown from content before passing to PrintableDocument */
export const cleanForPrint = stripMarkdown;
