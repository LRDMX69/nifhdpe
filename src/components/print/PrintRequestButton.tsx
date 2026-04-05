import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PrintRequestDialog } from "./PrintRequestDialog";

interface PrintRequestButtonProps {
  documentTitle: string;
  documentContent?: string;
  documentId?: string;
  documentType?: string;
}

export const PrintRequestButton = ({ documentTitle, documentContent, documentId, documentType }: PrintRequestButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Printer className="h-4 w-4 mr-1" />Request Print
      </Button>
      <PrintRequestDialog
        open={open}
        onOpenChange={setOpen}
        documentTitle={documentTitle}
        documentContent={documentContent}
        documentId={documentId}
        documentType={documentType}
      />
    </>
  );
};
