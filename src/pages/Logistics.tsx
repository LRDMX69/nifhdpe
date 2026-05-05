import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Truck, MapPin, Clock, Loader2, MoreVertical, Pencil, Trash2, CheckCircle2, Navigation, Fuel, Car, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { generateWaybill } from "@/lib/generateWaybill";

const statusBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline", in_transit: "secondary", delivered: "default", cancelled: "destructive",
};

const Logistics = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "warehouse" || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Database["public"]["Tables"]["deliveries"]["Row"] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Database["public"]["Tables"]["deliveries"]["Row"] | null>(null);
  const [saving, setSaving] = useState(false);
  const listRef = useGsapStagger(".gsap-card", 0.06);

  const [projectId, setProjectId] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [distance, setDistance] = useState("");
  const [cost, setCost] = useState("");
  const [destState, setDestState] = useState("");
  const [siteName, setSiteName] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ["deliveries", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("deliveries").select("*, projects(name)").eq("organization_id", orgId).order("delivery_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-delivery", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("vehicles").select("*").eq("organization_id", orgId).order("plate_number");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: fuelLogs = [] } = useQuery({
    queryKey: ["fuel-logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("fuel_logs").select("*, vehicles(plate_number)").eq("organization_id", orgId).order("log_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (d: Database["public"]["Tables"]["deliveries"]["Row"]) => {
    setEditingDelivery(d);
    setProjectId(d.project_id ?? "");
    setDestination(d.destination);
    setVehicle(d.vehicle ?? "");
    setDriver(d.driver ?? "");
    setDeliveryDate(d.delivery_date);
    setDistance(d.distance_km?.toString() ?? "");
    setCost(d.cost?.toString() ?? "");
    setDestState(d.destination_state ?? "");
    setSiteName(d.site_name ?? "");
    setDestLat(d.destination_lat?.toString() ?? "");
    setDestLng(d.destination_lng?.toString() ?? "");
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingDelivery(null);
    setProjectId(""); setDestination(""); setVehicle(""); setDriver(""); setDistance(""); setCost("");
    setDeliveryDate(new Date().toISOString().split("T")[0]);
    setDestState(""); setSiteName("");
    setDestLat(""); setDestLng("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !user || !destination.trim()) return;
    if (!destLat || !destLng) {
      toast({ title: "Coordinates required", description: "Enter destination latitude and longitude for GPS delivery verification.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Database["public"]["Tables"]["deliveries"]["Insert"] = {
        organization_id: orgId,
        created_by: user.id,
        status: editingDelivery ? (editingDelivery.status as "pending" | "in_transit" | "delivered" | "cancelled") : "pending",
        project_id: projectId || null,
        destination: destination.trim(),
        vehicle: vehicle || null,
        driver: driver || null,
        delivery_date: deliveryDate,
        distance_km: distance ? parseFloat(distance) : 0,
        cost: cost ? parseFloat(cost) : 0,
        destination_state: destState || null,
        site_name: siteName || null,
        destination_lat: destLat ? parseFloat(destLat) : null,
        destination_lng: destLng ? parseFloat(destLng) : null,
      };
      if (editingDelivery) {
        const { error } = await supabase.from("deliveries").update(payload as Database["public"]["Tables"]["deliveries"]["Update"]).eq("id", editingDelivery.id);
        if (error) throw error;
        toast({ title: "Delivery updated" });
      } else {
        const { error } = await supabase.from("deliveries").insert(payload);
        if (error) throw error;
        toast({ title: "Delivery scheduled" });
      }
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** Haversine distance in meters between two lat/lng points */
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const payload: Database["public"]["Tables"]["deliveries"]["Update"] = { status: newStatus as Database["public"]["Tables"]["deliveries"]["Row"]["status"] };
      if (newStatus === "delivered") {
        payload.delivered_at = new Date().toISOString();

        // Find the delivery to check destination coordinates
        const delivery = deliveries.find((d) => (d as any).id === id);
        const destLat = (delivery as any)?.destination_lat;
        const destLng = (delivery as any)?.destination_lng;

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const userLat = pos.coords.latitude;
              const userLng = pos.coords.longitude;

              // GPS geofence enforcement: 300m radius
              if (destLat != null && destLng != null) {
                const distance = haversineDistance(userLat, userLng, Number(destLat), Number(destLng));
                if (distance > 300) {
                  toast({
                    title: "Delivery blocked",
                    description: `You are ${Math.round(distance)}m from the destination. Must be within 300m to mark as delivered.`,
                    variant: "destructive",
                  });
                  return;
                }
              } else {
                toast({ title: "Warning", description: "No destination coordinates set — GPS validation skipped." });
              }

              await supabase.from("deliveries").update({
                ...payload,
                delivered_lat: userLat,
                delivered_lng: userLng,
              }).eq("id", id);
              toast({ title: "Marked as delivered with GPS ✓" });
              refetch();
            },
            async () => {
              // No GPS available — block if destination coords exist
              if (destLat != null && destLng != null) {
                toast({ title: "GPS required", description: "Enable location services to verify delivery proximity.", variant: "destructive" });
                return;
              }
              await supabase.from("deliveries").update(payload).eq("id", id);
              toast({ title: "Marked as delivered (no GPS)" });
              refetch();
            }
          );
          return;
        } else if (destLat != null && destLng != null) {
          toast({ title: "GPS required", description: "Your browser does not support geolocation.", variant: "destructive" });
          return;
        }
      }
      const { error } = await supabase.from("deliveries").update(payload).eq("id", id);
      if (error) throw error;
      toast({ title: `Status updated to ${newStatus.replace("_", " ")}` });
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("deliveries").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Delivery deleted" });
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filtered = deliveries.filter((d) => {
    const projectName = (d as any).projects?.name ?? "";
    const matchSearch = projectName.toLowerCase().includes(search.toLowerCase()) || (d.driver ?? "").toLowerCase().includes(search.toLowerCase()) || d.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Logistics & Fleet" description="Delivery scheduling, vehicle tracking, and fuel logs" />

      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="deliveries" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Truck className="h-4 w-4 mr-2" /> Deliveries
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Car className="h-4 w-4 mr-2" /> Fleet
          </TabsTrigger>
          <TabsTrigger value="fuel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Fuel className="h-4 w-4 mr-2" /> Fuel Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deliveries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> New Delivery</Button>}
          </div>

          <div ref={listRef} className="space-y-3">
            {filtered.length === 0 && (
              <Card className="border-border/50"><CardContent className="py-8 text-center text-muted-foreground">
                {deliveries.length === 0 ? "No deliveries yet. Schedule your first delivery above." : "No deliveries match your filter."}
              </CardContent></Card>
            )}
            {filtered.map((d) => (
              <Card key={d.id} className="gsap-card border-border/50 hover:border-primary/20 transition-all">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><Truck className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{(d as any).projects?.name ?? "Unlinked delivery"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.destination}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {d.delivery_date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.vehicle ?? "—"} · {d.driver ?? "—"} · {d.distance_km ?? 0}km{d.site_name ? ` · ${d.site_name}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-sm">{formatCurrency(d.cost ?? 0)}</span>
                    <Badge variant={statusBadge[d.status || "pending"] ?? "outline"} className="capitalize text-xs">{(d.status ?? "pending").replace("_", " ")}</Badge>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            try {
                              await generateWaybill({
                                date: d.delivery_date,
                                driver: d.driver ?? "",
                                vehicle: d.vehicle ?? "",
                                destination: d.destination,
                                destinationState: d.destination_state,
                                siteName: d.site_name,
                                projectName: (d as any).projects?.name,
                                notes: d.notes,
                                issuedBy: user?.email ?? undefined,
                              });
                            } catch (err) {
                              toast({ title: "Waybill failed", description: (err as Error).message, variant: "destructive" });
                            }
                          }}><FileText className="h-3.5 w-3.5 mr-2" />Print Waybill</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {d.status !== "in_transit" && <DropdownMenuItem onClick={() => handleStatusChange(d.id, "in_transit")}><Navigation className="h-3.5 w-3.5 mr-2" />In Transit</DropdownMenuItem>}
                          {d.status !== "delivered" && <DropdownMenuItem onClick={() => handleStatusChange(d.id, 'delivered')}><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Delivered</DropdownMenuItem>}
                          {d.status !== "pending" && <DropdownMenuItem onClick={() => handleStatusChange(d.id, 'pending')}>Reset to Pending</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vehicles">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.length === 0 ? (
              <p className="col-span-full text-center py-12 text-muted-foreground">No vehicles registered.</p>
            ) : (
              vehicles.map((v: any) => (
                <Card key={v.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-bold text-sm">{v.plate_number}</h3>
                          <p className="text-xs text-muted-foreground">{v.make} {v.model} ({v.year})</p>
                        </div>
                      </div>
                      <Badge variant={v.status === 'active' ? 'default' : 'outline'}>{v.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <div>Current KM: <span className="text-foreground">{v.current_km?.toLocaleString()}</span></div>
                      <div>Last Service: <span className="text-foreground">{v.last_maintenance_date || "—"}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="fuel">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Liters</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">KM Reading</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {fuelLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No fuel logs recorded.</TableCell></TableRow>
                  ) : (
                    fuelLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{log.date}</TableCell>
                        <TableCell className="text-xs font-bold">{log.vehicles?.plate_number}</TableCell>
                        <TableCell className="text-xs">{log.liters} L</TableCell>
                        <TableCell className="text-right text-xs font-bold">{formatCurrency(log.total_cost)}</TableCell>
                        <TableCell className="text-right text-xs">{log.km_reading?.toLocaleString()} km</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingDelivery ? "Edit Delivery" : "Schedule New Delivery"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Destination *</Label><Input placeholder="Delivery address" value={destination} onChange={(e) => setDestination(e.target.value)} required /></div>
              <div className="space-y-2"><Label>State</Label><Input placeholder="e.g. Lagos" value={destState} onChange={(e) => setDestState(e.target.value)} /></div>
              <div className="space-y-2"><Label>Site Name</Label><Input placeholder="Site / Company name" value={siteName} onChange={(e) => setSiteName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Latitude *</Label><Input type="number" step="any" placeholder="6.5244" value={destLat} onChange={(e) => setDestLat(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Longitude *</Label><Input type="number" step="any" placeholder="3.3792" value={destLng} onChange={(e) => setDestLng(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Vehicle</Label><Input placeholder="Vehicle & plate" value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Driver</Label><Input placeholder="Driver name" value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
              <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Distance (km)</Label><Input type="number" placeholder="0" value={distance} onChange={(e) => setDistance(e.target.value)} /></div>
              <div className="space-y-2"><Label>Cost (₦)</Label><Input type="number" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingDelivery ? "Update" : "Schedule"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this delivery?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Logistics;
