import { ArrowRight, BarChart3, BookOpen, Calculator, ClipboardCheck, FileText, FolderKanban, Landmark, MessagesSquare, Package, ReceiptText, ShoppingCart, Truck, Users, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuickAction = { title: string; description: string; href: string; icon: typeof ArrowRight };

const quickStartByRole: Record<string, { title: string; description: string; actions: QuickAction[] }> = {
  administrator: {
    title: "Start with today’s overview",
    description: "Open the areas that usually need an administrator’s attention first.",
    actions: [
      { title: "Review today’s overview", description: "See approvals, exceptions, and follow-ups.", href: "/dashboard", icon: ClipboardCheck },
      { title: "Review financial position", description: "Open money in, money out, invoices, and reconciliation.", href: "/finance", icon: Landmark },
      { title: "Manage people and access", description: "Review staff records, roles, and workspace access.", href: "/settings", icon: Users },
    ],
  },
  engineer: {
    title: "Start with project execution",
    description: "These are the three places most technical decisions begin.",
    actions: [
      { title: "Open projects", description: "Review active sites, milestones, teams, and project status.", href: "/projects", icon: FolderKanban },
      { title: "Review field reports", description: "Check daily site updates, evidence, and progress notes.", href: "/field-reports", icon: FileText },
      { title: "Check HSE", description: "Review site safety checks, incidents, and compliance follow-up.", href: "/hse", icon: ClipboardCheck },
    ],
  },
  technician: {
    title: "Start with today’s site work",
    description: "Use these actions for attendance, site notes, and equipment needs.",
    actions: [
      { title: "Open today’s assignments", description: "See assigned sites and current progress.", href: "/projects", icon: FolderKanban },
      { title: "Submit a field report", description: "Record what happened on site and attach evidence.", href: "/field-reports", icon: FileText },
      { title: "Request equipment", description: "Find the tool or machine you need for the job.", href: "/equipment", icon: Wrench },
    ],
  },
  warehouse: {
    title: "Start with stock and dispatch",
    description: "These actions follow the normal warehouse flow from stock to delivery.",
    actions: [
      { title: "Check inventory", description: "See what is available, reserved, or running low.", href: "/inventory", icon: Package },
      { title: "Plan a delivery", description: "Assign dispatch details, vehicles, and delivery status.", href: "/logistics", icon: Truck },
      { title: "Review purchases", description: "Check requisitions and purchase orders for incoming materials.", href: "/procurement", icon: ShoppingCart },
    ],
  },
  finance: {
    title: "Start with money in and money out",
    description: "These actions cover the normal daily finance review.",
    actions: [
      { title: "Review Finance", description: "Open invoices, receipts, expenses, and worker payments.", href: "/finance", icon: ReceiptText },
      { title: "Review procurement", description: "Check purchase orders, approvals, and vendor commitments.", href: "/procurement", icon: ShoppingCart },
      { title: "Open analytics", description: "See collections, costs, cashflow, and business trends.", href: "/analytics", icon: BarChart3 },
    ],
  },
  reception_sales: {
    title: "Start with the sales pipeline",
    description: "Move from a possible project to a clear client quotation.",
    actions: [
      { title: "Review opportunities", description: "Qualify leads and follow up on active possibilities.", href: "/opportunities", icon: BarChart3 },
      { title: "Create a quotation", description: "Prepare an itemized estimate with terms and assumptions.", href: "/quotations", icon: FileText },
      { title: "Open clients", description: "Find client contacts, sites, and relationship history.", href: "/clients", icon: Users },
    ],
  },
  knowledge_manager: {
    title: "Start with shared knowledge",
    description: "Keep the documents and conversations that help the team work consistently easy to find.",
    actions: [
      { title: "Open document registry", description: "Find, review, and reprint approved company documents.", href: "/documents", icon: BookOpen },
      { title: "Review HR learning", description: "Open training and people context shared with HR.", href: "/hr", icon: Users },
      { title: "Open messages", description: "Respond to requests and clarify operational knowledge.", href: "/messages", icon: MessagesSquare },
    ],
  },
  siwes_trainee: {
    title: "Start your learning path",
    description: "Use these actions to learn the system and record your progress.",
    actions: [
      { title: "Submit a reflection", description: "Record what you learned and what challenged you.", href: "/dashboard", icon: FileText },
      { title: "Practice pipe calculations", description: "Use the calculator to build technical confidence.", href: "/calculator", icon: Calculator },
      { title: "Review company documents", description: "Study approved project and operating documents.", href: "/documents", icon: BookOpen },
    ],
  },
};

export function RoleQuickStart({ role }: { role: string }) {
  const config = quickStartByRole[role] ?? quickStartByRole.technician;
  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {config.actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40">
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{action.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.description}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
