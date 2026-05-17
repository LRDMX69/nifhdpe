import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, BookOpen, ShieldCheck, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type IncidentRow = Database["public"]["Tables"]["hse_incidents"]["Row"];
type TbtRow = Database["public"]["Tables"]["toolbox_talks"]["Row"];

const HSE = () => {
  const { user, activeRole, memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [incidentOpen, setIncidentOpen] = useState(false);
  const [tbtOpen, setTbtOpen] = useState(false);

  const [incidentDate, setIncidentDate] = useState("");
  const [incidentType, setIncidentType] = useState("near_miss");
  const [incidentSeverity, setIncidentSeverity] = useState("low");

  const [tbtTopic, setTbtTopic] = useState("");
  const [tbtDate, setTbtDate] = useState("");

  const createIncident = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase.from("hse_incidents").insert({
        organization_id: orgId,
        incident_date: incidentDate || new Date().toISOString().split('T')[0],
        type: incidentType,
        severity: incidentSeverity,
        status: "open",
        description: "New incident reported"
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Incident reported" });
      setIncidentOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hse-incidents"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createTbt = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const currentUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("Not logged in");
      const { error } = await supabase.from("toolbox_talks").insert({
        organization_id: orgId,
        topic: tbtTopic || "General Safety",
        conducted_at: tbtDate || new Date().toISOString().split('T')[0],
        conducted_by: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Toolbox Talk added" });
      setTbtOpen(false);
      queryClient.invalidateQueries({ queryKey: ["toolbox-talks"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["hse-incidents", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("hse_incidents").select("*").order("incident_date", { ascending: false });
      return (data ?? []) as IncidentRow[];
    },
    enabled: !!orgId,
  });

  const { data: tbts = [], isLoading: tbtsLoading } = useQuery({
    queryKey: ["toolbox-talks", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("toolbox_talks").select("*").order("conducted_at", { ascending: false });
      return (data ?? []) as TbtRow[];
    },
    enabled: !!orgId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Health, Safety & Environment" description="Monitor site safety, report incidents, and manage toolbox talks" />

      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Incidents
          </TabsTrigger>
          <TabsTrigger value="tbts" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Toolbox Talks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Incident Register</CardTitle>
              <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Report Incident</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Report HSE Incident</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={incidentType} onValueChange={setIncidentType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="near_miss">Near Miss</SelectItem>
                          <SelectItem value="injury">Injury</SelectItem>
                          <SelectItem value="property_damage">Property Damage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createIncident.mutate()} disabled={createIncident.isPending}>
                      {createIncident.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : incidents.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Safety record is clean. No incidents reported.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {incidents.map((i: IncidentRow) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs">{i.incident_date}</TableCell>
                        <TableCell className="text-xs font-medium capitalize">{i.type?.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs">{i.location || "—"}</TableCell>
                        <TableCell><Badge variant={i.severity === 'high' || i.severity === 'critical' ? 'destructive' : 'outline'} className="capitalize text-[10px]">{i.severity}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize text-[10px]">{i.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tbts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Toolbox Talk Attendance</CardTitle>
              <Dialog open={tbtOpen} onOpenChange={setTbtOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />New TBT</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Toolbox Talk</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <Input value={tbtTopic} onChange={e => setTbtTopic(e.target.value)} placeholder="e.g. Confined Space Safety" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={tbtDate} onChange={e => setTbtDate(e.target.value)} />
                    </div>
                    <Button className="w-full" onClick={() => createTbt.mutate()} disabled={createTbt.isPending || !tbtTopic}>
                      {createTbt.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Record
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {tbtsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : tbts.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No toolbox talks recorded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tbts.map((t: TbtRow) => (
                    <Card key={t.id} className="border-border/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-sm">{t.topic}</h3>
                          <span className="text-[10px] text-muted-foreground">{t.conducted_at}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Conducted by: {t.conducted_by?.slice(0, 8) ?? "—"}</p>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{Array.isArray(t.attendees) ? t.attendees.length : 0} Attendees</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HSE;
