import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { industrialDb } from "@/lib/industrialDb";
import { useQuery } from "@tanstack/react-query";
import { generateAndRecordWaybill } from "@/lib/generateWaybill";
import { humanizeError } from "@/lib/humanizeError";

interface Line { description: string; quantity: string; unit: string }
interface Props { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: () => void }
type ClientRow = { id: string; name: string };
type ProjectRow = { id: string; name: string; client_id?: string | null };
type OrderRow = { id: string; order_number: string; client_id: string; project_id?: string | null; status: string };
type DeliveryRow = { id: string; document_number?: string | null; destination: string; destination_state?: string | null; site_name?: string | null; client_id?: string | null; project_id?: string | null; sales_order_id?: string | null };

/** Standalone or source-linked waybill issuer. Every generated copy is persisted before printing. */
export const WaybillDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [driver, setDriver] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [destination, setDestination] = useState("");
  const [destState, setDestState] = useState("");
  const [siteName, setSiteName] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "", unit: "pcs" }]);
  const [busy, setBusy] = useState(false);

  const { data: clients = [] } = useQuery({ queryKey: ["waybill-clients", orgId], queryFn: async () => { if (!orgId) return [] as ClientRow[]; const { data, error } = await industrialDb.from("clients").select("id, name").eq("organization_id", orgId).order("name"); if (error) throw error; return (data ?? []) as ClientRow[]; }, enabled: !!orgId && open });
  const { data: orders = [] } = useQuery({ queryKey: ["waybill-orders", orgId], queryFn: async () => { if (!orgId) return [] as OrderRow[]; const { data, error } = await industrialDb.from("sales_orders").select("id, order_number, client_id, project_id, status").eq("organization_id", orgId).not("status", "eq", "cancelled").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as OrderRow[]; }, enabled: !!orgId && open });
  const { data: projects = [] } = useQuery({ queryKey: ["waybill-projects", orgId], queryFn: async () => { if (!orgId) return [] as ProjectRow[]; const { data, error } = await industrialDb.from("projects").select("id, name, client_id").eq("organization_id", orgId).order("name"); if (error) throw error; return (data ?? []) as ProjectRow[]; }, enabled: !!orgId && open });
  const { data: deliveries = [] } = useQuery({ queryKey: ["waybill-deliveries", orgId], queryFn: async () => { if (!orgId) return [] as DeliveryRow[]; const { data, error } = await industrialDb.from("deliveries").select("id, document_number, destination, destination_state, site_name, client_id, project_id, sales_order_id").eq("organization_id", orgId).not("status", "eq", "cancelled").order("delivery_date", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as DeliveryRow[]; }, enabled: !!orgId && open });

  useEffect(() => {
    if (!open) {
      setDate(new Date().toISOString().slice(0, 10)); setClientId(""); setOrderId(""); setDeliveryId(""); setProjectId(""); setDriver(""); setVehicle(""); setDestination(""); setDestState(""); setSiteName(""); setProject(""); setNotes(""); setLines([{ description: "", quantity: "", unit: "pcs" }]);
    }
  }, [open]);

  const update = (index: number, patch: Partial<Line>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const selectOrder = (value: string) => { const order = orders.find((candidate) => candidate.id === value); setOrderId(value === "none" ? "" : value); if (order) { setClientId(order.client_id); setProjectId(order.project_id ?? ""); } };
  const selectProject = (value: string) => { const selected = projects.find((candidate) => candidate.id === value); setProjectId(value === "none" ? "" : value); if (selected) { setProject(selected.name); if (selected.client_id) setClientId(selected.client_id); } };
  const selectDelivery = (value: string) => { const delivery = deliveries.find((candidate) => candidate.id === value); setDeliveryId(value === "none" ? "" : value); if (delivery) { if (delivery.client_id) setClientId(delivery.client_id); if (delivery.sales_order_id) setOrderId(delivery.sales_order_id); if (delivery.project_id) setProjectId(delivery.project_id); setDestination(delivery.destination); setDestState(delivery.destination_state ?? ""); setSiteName(delivery.site_name ?? ""); } };

  const submit = async () => {
    if (!orgId || !user) return;
    if (!destination.trim()) { toast({ title: "Destination is required", variant: "destructive" }); return; }
    if (!driver.trim()) { toast({ title: "Driver name is required", variant: "destructive" }); return; }
    const items = lines.filter((line) => line.description.trim()).map((line) => ({ description: line.description.trim(), quantity: line.quantity || "—", unit: line.unit }));
    if (items.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const record = await generateAndRecordWaybill({ organizationId: orgId, deliveryId: deliveryId || null, salesOrderId: orderId || null, clientId: clientId || null, projectId: projectId || null, idempotencyKey: `waybill:${orgId}:${user.id}:${Date.now()}`, date, driver: driver.trim(), vehicle: vehicle.trim(), destination: destination.trim(), destinationState: destState.trim() || null, siteName: siteName.trim() || null, projectName: project.trim() || null, notes: notes.trim() || null, items, issuedBy: user.email ?? undefined });
      toast({ title: "Waybill generated and recorded", description: `${record.document_number} is now in the Document Registry and can be reprinted.` });
      onOpenChange(false); onCreated?.();
    } catch (error) {
      toast({ title: "Waybill was not completed", description: humanizeError(error), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Issue and print waybill</DialogTitle></DialogHeader><div className="space-y-5"><div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">The system first saves a permanent waybill record, then renders the PDF, then marks it printed. Failed rendering stays visible as a retryable document state.</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><div className="space-y-1.5"><Label>Source delivery</Label><Select value={deliveryId || "none"} onValueChange={selectDelivery}><SelectTrigger><SelectValue placeholder="Optional delivery" /></SelectTrigger><SelectContent><SelectItem value="none">Standalone waybill</SelectItem>{deliveries.map((delivery) => <SelectItem key={delivery.id} value={delivery.id}>{delivery.document_number ?? "Delivery"} · {delivery.destination}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Sales order</Label><Select value={orderId || "none"} onValueChange={selectOrder}><SelectTrigger><SelectValue placeholder="Optional order" /></SelectTrigger><SelectContent><SelectItem value="none">No order link</SelectItem>{orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.order_number} · {order.status}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Client</Label><Select value={clientId || "none"} onValueChange={(value) => setClientId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Optional client" /></SelectTrigger><SelectContent><SelectItem value="none">No client link</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Project</Label><Select value={projectId || "none"} onValueChange={selectProject}><SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger><SelectContent><SelectItem value="none">No project link</SelectItem>{projects.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="space-y-1.5"><Label>Driver *</Label><Input placeholder="Driver full name" value={driver} onChange={(e) => setDriver(e.target.value)} /></div><div className="space-y-1.5"><Label>Vehicle</Label><Input placeholder="Plate number / make" value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></div><div className="space-y-1.5"><Label>Destination State</Label><Input placeholder="e.g. Rivers" value={destState} onChange={(e) => setDestState(e.target.value)} /></div><div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label>Destination *</Label><Input placeholder="Full address" value={destination} onChange={(e) => setDestination(e.target.value)} /></div><div className="space-y-1.5"><Label>Site / Recipient</Label><Input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Project label</Label><Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Shown on the printed waybill" /></div></div><div className="space-y-2"><div className="flex items-center justify-between"><Label>Items being conveyed *</Label><Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, { description: "", quantity: "", unit: "pcs" }])}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>{lines.map((line, index) => <div key={index} className="grid grid-cols-12 gap-2 items-end"><div className="col-span-12 sm:col-span-7"><Input placeholder="Description (e.g. 110mm HDPE pipe x 6m)" value={line.description} onChange={(e) => update(index, { description: e.target.value })} /></div><div className="col-span-5 sm:col-span-2"><Input placeholder="Qty" value={line.quantity} onChange={(e) => update(index, { quantity: e.target.value })} /></div><div className="col-span-5 sm:col-span-2"><Input placeholder="Unit" value={line.unit} onChange={(e) => update(index, { unit: e.target.value })} /></div><div className="col-span-2 sm:col-span-1 flex justify-end">{lines.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>)}</div><div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special handling instructions, checkpoint info, etc." /></div><div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Generate, save & print waybill</Button></div></div></DialogContent></Dialog>;
};
