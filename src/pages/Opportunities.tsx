import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, Calendar, TrendingUp, Award, RefreshCw, Loader2, Brain, BarChart3, MapPin, Phone, Mail, Link, Printer, DollarSign, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import type { Database } from "@/integrations/supabase/types";

type OpportunityItem = Database["public"]["Tables"]["opportunities"]["Row"];

const statusColors: Record<string, string> = {
  identified: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bidding: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

const Opportunities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [viewingOpp, setViewingOpp] = useState<OpportunityItem | null>(null);
  const { response: proposalEmail, loading: generatingEmail, error: emailError, ask: askAi, reset: resetAi } = useAiAssistant({ context: "opportunities" });
  const containerRef = useGsapAnimation("slideUp");

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  const { data: opportunities = [], refetch } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .order("relevance_score", { ascending: false, nullsFirst: false });
      return (data as OpportunityItem[]) ?? [];
    },
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-insights-opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("context", "opportunities")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const filtered = filter === "all" ? opportunities : opportunities.filter((o) => o.status === filter);
  const totalValue = opportunities.reduce((s: number, o) => s + (o.estimated_value || 0), 0);
  const activeBids = opportunities.filter((o) => o.status === "bidding").length;
  const wonCount = opportunities.filter((o) => o.status === "won").length;

  const handleRefreshIntelligence = async () => {
    setScanning(true);
    try {
      await supabase.functions.invoke("opportunity-scanner", { body: { action: "refresh" } });
      await refetch();
      toast({ title: "Intelligence refreshed", description: "AI has re-analyzed all opportunities." });
    } catch {
      toast({ title: "Scan failed", description: "Could not refresh intelligence.", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleAddOpportunity = async () => {
    if (!title.trim() || !user) return;
    try {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
      if (!profile?.organization_id) throw new Error("No org");
      await supabase.from("opportunities").insert({
        title, source: source || null, estimated_value: value ? parseFloat(value) : null,
        deadline: deadline || null, description: description || null,
        organization_id: profile.organization_id, created_by: user.id,
      });
      toast({ title: "Opportunity added" });
      setOpen(false);
      setTitle(""); setSource(""); setValue(""); setDeadline(""); setDescription("");
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Parse contact and submission info from description
  const parseContactInfo = (desc: string) => {
    const contactMatch = desc?.match(/📞 Contact: (.+)/);
    const submissionMatch = desc?.match(/📝 How to Apply: (.+)/);
    const cleanDesc = desc?.replace(/\n\n📞 Contact:.+/s, '').trim();
    return {
      description: cleanDesc,
      contact: contactMatch?.[1] ?? null,
      submission: submissionMatch?.[1] ?? null,
    };
  };

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Opportunities" description="AI-ranked tenders, bids, and business intelligence">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefreshIntelligence} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="print-hide" onClick={() => {
            import("@/lib/generatePdf").then(({ generatePdf }) => {
              generatePdf({
                title: "Opportunities Pipeline",
                tableData: {
                  columns: [
                    { header: "Opportunity Title", dataKey: "title" },
                    { header: "Source", dataKey: "source" },
                    { header: "Status", dataKey: "status" },
                    { header: "Value (₦)", dataKey: "value" },
                    { header: "Deadline", dataKey: "deadline" },
                  ],
                  rows: (opportunities as OpportunityItem[]).map((o) => ({
                    title: o.title,
                    source: o.source || "—",
                    status: o.status || "—",
                    value: o.estimated_value ? Number(o.estimated_value).toLocaleString() : "TBD",
                    deadline: o.deadline || "—",
                  })),
                  summary: [
                    { label: "Total Opportunities", value: String(opportunities.length) },
                    { label: "Total Pipeline Value", value: `₦${totalValue.toLocaleString()}` },
                  ]
                },
                stampType: "admin",
              });
            });
          }}>
            <Printer className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Print</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opportunity title" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Source</Label>
                    <Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{["Government Tender", "Private Sector", "Oil & Gas", "Real Estate", "Water Board", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Value (₦)</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" /></div>
                </div>
                <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the opportunity..." rows={3} /></div>
                <Button className="w-full" onClick={handleAddOpportunity}>Save Opportunity</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pipeline Value", value: formatCurrency(totalValue), icon: TrendingUp },
          { label: "Active Bids", value: String(activeBids), icon: Target },
          { label: "Won", value: String(wonCount), icon: Award },
          { label: "Total Tracked", value: String(opportunities.length), icon: Calendar },
        ].map(s => (
          <Card key={s.label} className="border-border/50 shadow-sm"><CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">{s.label}</p><p className="text-lg sm:text-2xl font-bold truncate text-foreground">{s.value}</p></div>
              <s.icon className="h-5 w-5 sm:h-8 sm:w-8 text-primary opacity-60 shrink-0" />
            </div>
          </CardContent></Card>
        ))}
      </div>

      {aiInsights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> AI Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm break-words-safe">{aiInsights.summary}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Updated: {new Date(aiInsights.created_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="identified">Identified</TabsTrigger>
          <TabsTrigger value="bidding">Bidding</TabsTrigger>
          <TabsTrigger value="won">Won</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Detail view dialog */}
      {viewingOpp && (
        <Dialog open={!!viewingOpp} onOpenChange={() => setViewingOpp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="break-words-safe">{viewingOpp.title}</DialogTitle>
            </DialogHeader>
            <div className="print-container space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="hidden print:block mb-4">
                <h2 className="text-xl font-bold">NIF Technical — Opportunity Brief</h2>
                <p className="text-sm">{new Date().toLocaleDateString()}</p>
              </div>
              {(() => {
                const info = parseContactInfo(viewingOpp.description ?? "");
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground">Source</p>
                        <p className="font-bold truncate">{viewingOpp.source || "—"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-bold text-primary truncate">{viewingOpp.estimated_value ? formatCurrency(viewingOpp.estimated_value) : "TBD"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground">Deadline</p>
                        <p className="font-bold truncate">{viewingOpp.deadline || "—"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground">Status</p>
                        <Badge className={statusColors[viewingOpp.status] || "capitalize"} variant="outline">{viewingOpp.status}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {viewingOpp.relevance_score != null && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Relevance</p>
                          <p className="text-sm font-bold">{viewingOpp.relevance_score}/10</p>
                        </div>
                      )}
                      {viewingOpp.success_probability != null && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Win Prob.</p>
                          <p className="text-sm font-bold text-primary">{viewingOpp.success_probability}%</p>
                        </div>
                      )}
                      {viewingOpp.competition_intensity && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Competition</p>
                          <p className="text-sm font-bold capitalize">{viewingOpp.competition_intensity}</p>
                        </div>
                      )}
                      {viewingOpp.capital_estimate && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Capital Est.</p>
                          <p className="text-sm font-bold truncate">{formatCurrency(viewingOpp.capital_estimate)}</p>
                        </div>
                      )}
                    </div>

                    {info.description && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                        <p className="text-sm text-foreground leading-relaxed break-words-safe whitespace-pre-wrap">{info.description}</p>
                      </div>
                    )}
                    
                    {info.contact && (
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        <p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> Contact Info</p>
                        <p className="text-muted-foreground break-words-safe">{info.contact}</p>
                      </div>
                    )}
                    
                    {info.submission && (
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        <p className="font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> How to Apply</p>
                        <p className="text-muted-foreground break-words-safe">{info.submission}</p>
                      </div>
                    )}
                    {viewingOpp.bid_strategy && (
                      <div className="bg-primary/5 rounded-lg p-3 text-sm border border-primary/20">
                        <p className="font-medium text-primary">AI Bid Strategy</p>
                        <p className="break-words-safe italic">{viewingOpp.bid_strategy}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 flex-wrap print-hide">
              <Button size="sm" variant="outline" onClick={() => {
                import("@/lib/generatePdf").then(({ generatePdf }) => {
                  const info = parseContactInfo(viewingOpp.description ?? "");
                  generatePdf({
                    title: `Opportunity Brief: ${viewingOpp.title}`,
                    contentSections: [
                      {
                        heading: "Opportunity Overview",
                        bullets: [
                          `Source: ${viewingOpp.source || "—"}`,
                          `Value: ${viewingOpp.estimated_value ? `₦${Number(viewingOpp.estimated_value).toLocaleString()}` : "TBD"}`,
                          `Deadline: ${viewingOpp.deadline || "—"}`,
                          `Status: ${viewingOpp.status || "—"}`,
                        ]
                      },
                      {
                        heading: "Strategic Assessment",
                        bullets: [
                          `Win Probability: ${viewingOpp.success_probability != null ? `${viewingOpp.success_probability}%` : "—"}`,
                          `Relevance Score: ${viewingOpp.relevance_score != null ? `${viewingOpp.relevance_score}/10` : "—"}`,
                          `Competition: ${viewingOpp.competition_intensity || "—"}`,
                          `Capital Required: ${viewingOpp.capital_estimate ? `₦${Number(viewingOpp.capital_estimate).toLocaleString()}` : "—"}`,
                        ]
                      },
                      ...(info.description ? [{ heading: "Description", body: info.description }] : []),
                      ...(info.contact ? [{ heading: "Contact Information", body: info.contact }] : []),
                      ...(info.submission ? [{ heading: "Submission Instructions", body: info.submission }] : []),
                      ...(viewingOpp.bid_strategy ? [{ heading: "AI Bid Strategy", body: viewingOpp.bid_strategy }] : []),
                    ],
                    stampType: "admin",
                  });
                });
              }}><Printer className="h-4 w-4 mr-1" />Print Brief</Button>
              <Button
                size="sm"
                onClick={() => {
                  resetAi();
                  askAi(`Generate a professional proposal/bid email for this opportunity. The email should:
- Introduce NIF Technical as a leading HDPE pipe infrastructure company
- Highlight our HDPE specialization and experience
- Reference the opportunity details: "${viewingOpp.title}", estimated value ${viewingOpp.estimated_value ? formatCurrency(viewingOpp.estimated_value) : "TBD"}, source: ${viewingOpp.source ?? "unknown"}
- Express interest and request next steps
- Be professional and concise
- Include Subject line, Body, and Signature block
- Do NOT include any internal financial data, passwords, or confidential information
- Only use publicly available company positioning information`);
                }}
                disabled={generatingEmail}
              >
                {generatingEmail ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Generate Proposal Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setViewingOpp(null); resetAi(); }}>Close</Button>
            </div>
            {emailError && (
              <div className="mt-4 bg-destructive/10 rounded-lg p-4 text-sm text-destructive">
                <p className="font-medium">Error generating email</p>
                <p>{emailError}</p>
              </div>
            )}
            {proposalEmail && (
              <div className="mt-4 bg-muted/30 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-primary flex items-center gap-1"><Sparkles className="h-4 w-4" /> AI-Generated Proposal Email (Draft)</p>
                <div className="whitespace-pre-wrap break-words-safe text-foreground">{proposalEmail}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(proposalEmail);
                    toast({ title: "Copied to clipboard" });
                  }}>Copy Email</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const blob = new Blob([proposalEmail], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `proposal-${viewingOpp.title.slice(0, 30)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "Downloaded" });
                  }}>Download</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="print-container grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
            No opportunities found. Add one manually or refresh intelligence.
          </CardContent></Card>
        )}
        {filtered.map((o) => {
          const info = parseContactInfo(o.description ?? "");
          return (
            <Card key={o.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setViewingOpp(o)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base break-words-safe">{o.title}</CardTitle>
                  <Badge className={statusColors[o.status || "identified"] || ""} variant="outline">{o.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {info.description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words-safe">{info.description}</p>}

                <div className="flex flex-wrap gap-1.5">
                  {o.relevance_score != null && (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><BarChart3 className="h-3 w-3" /> {o.relevance_score}/10</Badge>
                  )}
                  {o.success_probability != null && (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><Target className="h-3 w-3" /> {o.success_probability}%</Badge>
                  )}
                  {o.capital_estimate && (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><DollarSign className="h-3 w-3" /> {formatCurrency(o.capital_estimate)}</Badge>
                  )}
                  {o.competition_intensity && (
                    <Badge variant="outline" className="text-[10px] capitalize">{o.competition_intensity}</Badge>
                  )}
                </div>

                {info.contact && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0" />{info.contact}</p>
                )}

                <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{o.source || "Unknown"}</Badge>
                  <span className="font-bold text-primary text-sm">{o.estimated_value ? formatCurrency(o.estimated_value) : "TBD"}</span>
                </div>
                {o.deadline && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />Deadline: {o.deadline}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Opportunities;
