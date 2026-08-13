import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Receipt as ReceiptIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";
import { industrialDb } from "@/lib/industrialDb";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"] & { clients?: { name: string } | null };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: Invoice | null;
  onRecorded?: () => void;
}

const METHODS = ["bank_transfer", "cash", "cheque", "pos", "mobile_money"] as const;

/**
 * Records a payment against an invoice and immediately prints a numbered
 * Receipt PDF that the client can be handed.
 */
export const RecordPaymentDialog = ({ open, onOpenChange, invoice, onRecorded }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("bank_transfer");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount(""); setMethod("bank_transfer"); setReference("");
      setPaymentDate(new Date().toISOString().slice(0, 10)); setNotes("");
    } else if (invoice) {
      setAmount(String(invoice.balance_due ?? invoice.total_amount ?? 0));
    }
  }, [open, invoice]);

  const submit = async () => {
    if (!invoice || !user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { data: receipt, error } = await industrialDb.rpc("record_invoice_payment", {
        _org_id: invoice.organization_id,
        _invoice_id: invoice.id,
        _amount: amt,
        _payment_method: method,
        _reference_number: reference || null,
        _notes: [paymentDate, notes].filter(Boolean).join(" — ") || null,
      });
      if (error) throw error;
      const newBalance = Math.max(0, Number(invoice.balance_due ?? invoice.total_amount ?? 0) - amt);

      // Generate receipt PDF
      const { generatePdf } = await import("@/lib/generatePdf");
      await generatePdf({
        title: `Payment Receipt — ${receipt.document_number ?? ""}`,
        documentId: receipt.document_number ?? undefined,
        senderName: user.email ?? "Finance",
        senderDepartment: "Accounts",
        stampType: "finance",
        showSignature: true,
        contentSections: [
          {
            heading: "Payment Details",
            bullets: [
              `Client: ${invoice.clients?.name ?? "—"}`,
              `Invoice: ${invoice.document_number ?? invoice.id}`,
              `Amount Received: ${formatCurrency(amt)}`,
              `Payment Method: ${method.replace("_", " ").toUpperCase()}`,
              ...(reference ? [`Reference: ${reference}`] : []),
              `Payment Date: ${paymentDate}`,
              `Outstanding Balance: ${formatCurrency(newBalance)}`,
            ],
          },
          ...(notes ? [{ heading: "Notes", body: notes }] : []),
          { heading: "Acknowledgement", body: "We hereby acknowledge receipt of the above payment in good faith. Please retain this receipt for your records." },
        ],
      });

      toast({ title: "Payment recorded", description: `Receipt ${receipt.document_number} issued.` });
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      toast({ title: "Could not record payment", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptIcon className="h-5 w-5 text-emerald-500" />Record Payment</DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="space-y-4">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-medium">{invoice.document_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{invoice.clients?.name ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-primary">{formatCurrency(invoice.balance_due ?? 0)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>Amount Received (₦) *</Label><Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Reference / Cheque #</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record & Issue Receipt
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};