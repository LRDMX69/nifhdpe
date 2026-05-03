import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, BookOpen, ShieldCheck, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const HSE = () => {
  const { activeRole, memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["hse-incidents", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("hse_incidents").select("*, projects(name)").order("incident_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: tbts = [], isLoading: tbtsLoading } = useQuery({
    queryKey: ["toolbox-talks", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("toolbox_talks").select("*, projects(name)").order("date", { ascending: false });
      return data ?? [];
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
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Report Incident</Button>
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
                    <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Project</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {incidents.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs">{i.incident_date}</TableCell>
                        <TableCell className="text-xs font-medium capitalize">{i.type?.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs">{i.projects?.name}</TableCell>
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
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New TBT</Button>
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
                  {tbts.map((t: any) => (
                    <Card key={t.id} className="border-border/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-sm">{t.topic}</h3>
                          <span className="text-[10px] text-muted-foreground">{t.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Project: {t.projects?.name}</p>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{t.attendee_ids?.length || 0} Attendees</span>
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
