import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Plus, ClipboardList, Calendar, Users, AlertTriangle, Camera, CheckCircle2, Loader2, FileText, Send, Printer, MessageSquare } from "lucide-react";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrintRequestButton } from "@/components/print/PrintRequestButton";
import { ContextMessages } from "@/components/messaging/ContextMessages";

/** Strip markdown artifacts for clean display */
const cleanMarkdown = (text: string) =>
  text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/---/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const FieldReports = () => {
  const { user, activeRole, isMaintenance, memberships } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [structuredReport, setStructuredReport] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<any>(null); // Keeping any for now due to complex nested includes, but casting in loops
  const containerRef = useGsapAnimation("slideUp");
  const printRef = useRef<HTMLDivElement>(null);

  // Form state
  const [rawNotes, setRawNotes] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [crewMembers, setCrew] = useState("");
  const [safetyIncidents, setSafety] = useState("");
  const [pressureResult, setPressure] = useState("");
  const [clientFeedback, setClientFeedback] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [sendTo, setSendTo] = useState<"engineer" | "administrator">("engineer");

  const isTechnician = activeRole === "technician";
  const isAdmin = activeRole === "administrator" || isMaintenance;
  const isEngineer = activeRole === "engineer";

  // Filter reports based on role & routing
  const { data: reports = [], refetch } = useQuery({
    queryKey: ["field-reports", activeRole],
    queryFn: async () => {
      let query = supabase
        .from("field_reports")
        .select("*, structured_reports(*), projects(name)")
        .order("report_date", { ascending: false })
        .limit(30);

      // Non-admin/engineer only see their own reports
      if (!isAdmin && !isEngineer && user) {
        query = query.eq("created_by", user.id);
      }

      const { data } = await query;
      if (!data) return [];

      // Engineer: only see reports routed to them or their own
      if (isEngineer && !isAdmin && user) {
        return data.filter((r: any) =>
          r.created_by === user.id ||
          r.notes === "routed_to:engineer" ||
          !r.notes?.startsWith("routed_to:")
        );
      }

      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      return data ?? [];
    },
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(Array.from(e.target.files));
  };

  const handleSubmitReport = async () => {
    if (!rawNotes.trim()) {
      toast({ title: "Enter your notes", description: "Please describe the work done today.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
      if (!profile?.organization_id) throw new Error("No organization found");

      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${user.id}/${Date.now()}-${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("site-photos").upload(fileName, photo);
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("site-photos").getPublicUrl(uploadData.path);
          photoUrls.push(urlData.publicUrl);
        }
      }

      const { data: report, error: reportError } = await supabase
        .from("field_reports")
        .insert({
          organization_id: profile.organization_id,
          created_by: user.id,
          project_id: selectedProject || null,
          tasks_completed: rawNotes,
          crew_members: crewMembers || null,
          safety_incidents: safetyIncidents || null,
          pressure_test_result: pressureResult || null,
          client_feedback: clientFeedback || null,
          notes: isTechnician ? `routed_to:${sendTo}` : null,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      for (const url of photoUrls) {
        await supabase.from("field_report_photos").insert({ field_report_id: report.id, photo_url: url });
      }

      setSubmitting(false);
      setProcessing(true);

      const { data: processData, error: processError } = await supabase.functions.invoke("process-report", {
        body: { reportId: report.id },
      });

      if (!processError) {
        setStructuredReport(processData?.structured_content || null);
        toast({ title: "Report processed", description: `AI has structured your report and sent it to the ${sendTo}.` });
      }

      setRawNotes(""); setSelectedProject(""); setCrew(""); setSafety(""); setPressure(""); setClientFeedback(""); setPhotos([]);
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setProcessing(false);
    }
  };

  const handlePrintReport = (report: any) => {
    const content = report.structured_reports?.[0]?.structured_content
      ? cleanMarkdown(report.structured_reports[0].structured_content)
      : `Tasks: ${report.tasks_completed}\nCrew: ${report.crew_members || 'N/A'}\nPressure Test: ${report.pressure_test_result || 'N/A'}\nSafety: ${report.safety_incidents || 'None'}`;
    return content;
  };

  // Get sender profiles for admin inbox
  const { data: senderProfiles = new Map() } = useQuery({
    queryKey: ["report-sender-profiles"],
    queryFn: async () => {
      if (!isAdmin) return new Map();
      const userIds = [...new Set(reports.map((r: any) => r.created_by))];
      if (userIds.length === 0) return new Map();
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      return new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    },
    enabled: isAdmin && reports.length > 0,
  });

  // Get sender membership roles for admin inbox
  const { data: senderRoles = new Map() } = useQuery({
    queryKey: ["report-sender-roles"],
    queryFn: async () => {
      if (!isAdmin) return new Map();
      const userIds = [...new Set(reports.map((r: any) => r.created_by))];
      if (userIds.length === 0) return new Map();
      const { data } = await supabase.from("organization_memberships").select("user_id, role").in("user_id", userIds);
      return new Map((data ?? []).map((m: any) => [m.user_id, m.role]));
    },
    enabled: isAdmin && reports.length > 0,
  });

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={isAdmin ? "Reports Inbox" : "Field Reports"}
        description={isAdmin ? "Review structured field reports from your team" : isTechnician ? "Submit your daily work report — AI handles the rest" : "Daily work reports, pressure tests, and site documentation"}
      >
        {/* Admin does NOT see submit button */}
        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Report</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isTechnician ? "Submit Raw Report" : "New Field Report"}</DialogTitle>
                {isTechnician && <p className="text-sm text-muted-foreground">Just enter your raw notes. AI will structure everything automatically.</p>}
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Crew</Label>
                    <Input value={crewMembers} onChange={(e) => setCrew(e.target.value)} placeholder="e.g., Team Alpha (4)" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isTechnician ? "What did you do today? (rough notes are fine)" : "Tasks Completed"}</Label>
                  <Textarea value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} placeholder={isTechnician ? "Just type what happened..." : "Describe work completed today..."} rows={4} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pressure Test</Label>
                    <Select value={pressureResult} onValueChange={setPressure}>
                      <SelectTrigger><SelectValue placeholder="Result" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">Passed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Safety Incidents</Label>
                    <Input value={safetyIncidents} onChange={(e) => setSafety(e.target.value)} placeholder="None" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client Feedback</Label>
                  <Textarea value={clientFeedback} onChange={(e) => setClientFeedback(e.target.value)} placeholder="Any client feedback?" rows={2} />
                </div>

                {isTechnician && (
                  <div className="space-y-2">
                    <Label>Send report to</Label>
                    <RadioGroup value={sendTo} onValueChange={(v) => setSendTo(v as any)} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="engineer" id="send-engineer" />
                        <Label htmlFor="send-engineer" className="text-sm cursor-pointer">Engineer</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="administrator" id="send-admin" />
                        <Label htmlFor="send-admin" className="text-sm cursor-pointer">Administrator (Direct)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Site Photos</Label>
                  <label className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors block">
                    <Camera className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">
                      {photos.length > 0 ? `${photos.length} photo(s) selected` : "Tap to capture or upload"}
                    </p>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoCapture} />
                  </label>
                </div>

                <Button className="w-full" onClick={handleSubmitReport} disabled={submitting || processing}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                    : processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI Processing...</>
                    : <><Send className="h-4 w-4 mr-2" />Submit Report</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Structured report preview after submission */}
      {structuredReport && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> AI-Structured Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="print-container" ref={printRef}>
              <div className="hidden print:block mb-4">
                <h2 className="text-xl font-bold">NIF Technical — Field Report</h2>
                <p className="text-sm">{new Date().toLocaleDateString()}</p>
                <Separator className="my-2" />
              </div>
              <div className="prose prose-sm max-w-none text-foreground text-sm leading-relaxed break-words-safe">
                {cleanMarkdown(structuredReport).split('\n').map((line, i) => (
                  <p key={i} className={line.trim() === '' ? 'h-2' : ''}>{line}</p>
                ))}
              </div>
              <div className="hidden print:block mt-8">
                <Separator className="my-4" />
                <div className="flex justify-between text-sm">
                  <div><p>Signature: ___________________</p></div>
                  <div><p>Date: {new Date().toLocaleDateString()}</p></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 print-hide">
              <Button size="sm" variant="outline" onClick={async () => {
                const { generatePdf } = await import("@/lib/generatePdf");
                generatePdf({ title: `Field Report - ${new Date().toLocaleDateString()}`, content: structuredReport ? cleanMarkdown(structuredReport) : "" });
              }}><Printer className="h-4 w-4 mr-1" />PDF</Button>
              <PrintRequestButton
                documentTitle={`Field Report - ${new Date().toLocaleDateString()}`}
                documentType="field_report"
                documentContent={structuredReport ? cleanMarkdown(structuredReport) : ""}
              />
              <Button size="sm" variant="outline" onClick={() => setStructuredReport(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View report dialog */}
      {viewingReport && (
        <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report: {viewingReport.projects?.name ?? "General"} — {viewingReport.report_date}</DialogTitle>
            </DialogHeader>
            <div className="print-container">
              <div className="hidden print:block mb-4">
                <h2 className="text-xl font-bold">NIF Technical — Field Report</h2>
                <p className="text-sm">Project: {viewingReport.projects?.name ?? "General"} | Date: {viewingReport.report_date}</p>
                <Separator className="my-2" />
              </div>
              {viewingReport.structured_reports?.[0] ? (
                <div className="prose prose-sm max-w-none text-foreground text-sm leading-relaxed break-words-safe">
                  {cleanMarkdown(viewingReport.structured_reports[0].structured_content).split('\n').map((line: string, i: number) => (
                    <p key={i} className={line.trim() === '' ? 'h-2' : ''}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p><strong>Tasks:</strong> {viewingReport.tasks_completed}</p>
                  {viewingReport.crew_members && <p><strong>Crew:</strong> {viewingReport.crew_members}</p>}
                  {viewingReport.pressure_test_result && <p><strong>Pressure Test:</strong> {viewingReport.pressure_test_result}</p>}
                  {viewingReport.safety_incidents && <p><strong>Safety:</strong> {viewingReport.safety_incidents}</p>}
                  {viewingReport.client_feedback && <p><strong>Client Feedback:</strong> {viewingReport.client_feedback}</p>}
                </div>
              )}
              <div className="hidden print:block mt-8">
                <Separator className="my-4" />
                <div className="flex justify-between text-sm">
                  <div><p>Signature: ___________________</p></div>
                  <div><p>Date: {new Date().toLocaleDateString()}</p></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2 print-hide">
              <Button size="sm" variant="outline" onClick={async () => {
                const { generatePdf } = await import("@/lib/generatePdf");
                const content = viewingReport.structured_reports?.[0]?.structured_content
                  ? cleanMarkdown(viewingReport.structured_reports[0].structured_content)
                  : [viewingReport.tasks_completed, viewingReport.crew_members, viewingReport.notes].filter(Boolean).join("\n");
                generatePdf({ title: `Report: ${viewingReport.projects?.name ?? "General"} — ${viewingReport.report_date}`, content });
              }}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <PrintRequestButton
                documentTitle={`Report: ${viewingReport.projects?.name ?? "General"} — ${viewingReport.report_date}`}
                documentType="field_report"
                documentId={viewingReport.id}
                documentContent={viewingReport.structured_reports?.[0]?.structured_content
                  ? cleanMarkdown(viewingReport.structured_reports[0].structured_content)
                  : viewingReport.tasks_completed}
              />
              <Button size="sm" variant="outline" onClick={() => setViewingReport(null)}>Close</Button>
            </div>
            {memberships[0]?.organization_id && (
              <ContextMessages
                contextType="field_report"
                contextId={viewingReport.id}
                orgId={memberships[0].organization_id}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Reports Today", value: String((reports as any[]).filter((r) => r.report_date === new Date().toISOString().split("T")[0]).length), icon: ClipboardList },
          { label: "This Week", value: String(reports.length), icon: Calendar },
          { label: "Active Crews", value: "—", icon: Users },
          { label: "Incidents", value: String((reports as any[]).filter((r) => r.safety_incidents && r.safety_incidents !== "None").length), icon: AlertTriangle },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="text-lg sm:text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 sm:h-8 sm:w-8 text-primary opacity-60 shrink-0" />
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="space-y-3">
        {reports.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            {isAdmin ? "No reports received yet." : "No reports yet. Submit your first field report above."}
          </CardContent></Card>
        )}
        {(reports as any[]).map((r) => {
          const senderProfile = senderProfiles.get(r.created_by);
          const senderRole = senderRoles.get(r.created_by);
          return (
            <Card key={r.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setViewingReport(r)}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {/* Admin inbox: show sender info */}
                    {isAdmin && senderProfile && (
                      <div className="flex items-center gap-2 mr-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {(senderProfile.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{senderProfile.full_name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{senderRole ?? "—"}</p>
                        </div>
                      </div>
                    )}
                    <p className="font-medium text-sm truncate">{r.projects?.name ?? "General Report"}</p>
                    {r.structured_reports && r.structured_reports.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]" variant="outline">AI Processed</Badge>
                    )}
                    {r.notes?.startsWith("routed_to:") && (
                      <Badge variant="outline" className="text-[10px] capitalize">→ {r.notes.replace("routed_to:", "")}</Badge>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{r.report_date}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {r.crew_members && <p className="text-xs sm:text-sm"><span className="text-muted-foreground">Crew:</span> {r.crew_members}</p>}
                  <p className="text-xs sm:text-sm line-clamp-2 break-words-safe"><span className="text-muted-foreground">Tasks:</span> {r.tasks_completed}</p>
                  <div className="flex items-center gap-4 text-[10px] sm:text-xs">
                    {r.pressure_test_result && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className={`h-3 w-3 ${r.pressure_test_result === "passed" ? "text-primary" : "text-muted-foreground"}`} />
                        {r.pressure_test_result}
                      </span>
                    )}
                    {r.safety_incidents && r.safety_incidents !== "None" && (
                      <span className="flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />{r.safety_incidents}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FieldReports;
