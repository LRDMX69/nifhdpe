import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const HolidayManager = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isExtended, setIsExtended] = useState(false);

  const { data: holidays = [], refetch } = useQuery({
    queryKey: ["holidays", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("holidays")
        .select("*")
        .eq("organization_id", orgId)
        .order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !user || !name.trim() || !date) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("holidays").insert({
        organization_id: orgId,
        name: name.trim(),
        date,
        is_extended: isExtended,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Holiday added" });
      setName(""); setDate(""); setIsExtended(false);
      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Holiday removed" });
      refetch();
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PartyPopper className="h-4 w-4" /> Holidays
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2"><Label>Holiday Name *</Label><Input placeholder="e.g. Independence Day" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={isExtended} onCheckedChange={setIsExtended} />
                  <Label>Multi-day / Extended Holiday</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {holidays.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No holidays configured</p>}
        {holidays.map((h: any) => (
          <div key={h.id} className={`flex items-center justify-between p-2 rounded-lg ${h.date === today ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
            <div>
              <p className="text-sm font-medium">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.date} {h.is_extended && <Badge variant="secondary" className="ml-1 text-[10px]">Extended</Badge>}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(h.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
