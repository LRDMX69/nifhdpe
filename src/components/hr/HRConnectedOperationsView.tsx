import { useState } from "react";
import { BriefcaseBusiness, ChevronRight, Landmark, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HRCommercialOperationsPanel } from "@/components/hr/HRCommercialOperationsPanel";
import { HRFinanceAuditWorkspace } from "@/components/hr/HRFinanceAuditWorkspace";
import { HRFinanceWorkspace } from "@/components/hr/HRFinanceWorkspace";

type Member = { user_id: string; role: string };
type Profile = { full_name?: string | null; account_number?: string | null };
type ConnectedView = "people-finance" | "commercial-logistics" | "bank-review";

type Props = {
  orgId?: string;
  userId?: string;
  members: Member[];
  profileMap: Map<string, Profile>;
  activeRole?: string;
};

const AREAS: Array<{ key: ConnectedView; label: string; description: string; icon: typeof WalletCards }> = [
  { key: "people-finance", label: "People & finance", description: "Payroll, loans, HMO, VAT and accounts", icon: WalletCards },
  { key: "commercial-logistics", label: "Commercial & deliveries", description: "Clients, quotations, invoices and deliveries", icon: BriefcaseBusiness },
  { key: "bank-review", label: "Bank review", description: "Statements, reconciliation and director ledger", icon: Landmark },
];

export function HRConnectedOperationsView({ orgId, userId, members, profileMap, activeRole }: Props) {
  const [view, setView] = useState<ConnectedView>("people-finance");

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Connected operations</CardTitle>
            <CardDescription className="mt-1 max-w-3xl leading-5">
              A single HR view of the records that affect people operations. Review context here, then use the owning module when you need to edit a record.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label="Connected HR work areas" className="space-y-2">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Choose a work area</p>
            {AREAS.map((area) => {
              const Icon = area.icon;
              const selected = view === area.key;
              return (
                <Button
                  key={area.key}
                  type="button"
                  variant={selected ? "secondary" : "ghost"}
                  className={`h-auto w-full justify-between gap-3 px-3 py-3 text-left ${selected ? "border border-primary/20 bg-primary/10 text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setView(area.key)}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{area.label}</span>
                      <span className="mt-0.5 block whitespace-normal text-[11px] font-normal leading-4 text-muted-foreground">{area.description}</span>
                    </span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${selected ? "translate-x-0.5 text-primary" : "opacity-50"}`} />
                </Button>
              );
            })}
          </nav>
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/60 p-3 sm:p-4">
            {view === "people-finance" && <HRFinanceWorkspace orgId={orgId} userId={userId} members={members} profileMap={profileMap} activeRole={activeRole} />}
            {view === "commercial-logistics" && <HRCommercialOperationsPanel orgId={orgId} />}
            {view === "bank-review" && <HRFinanceAuditWorkspace orgId={orgId} userId={userId} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
