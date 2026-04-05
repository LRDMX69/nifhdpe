import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Database } from "@/integrations/supabase/types";

interface AttendanceTabProps {
  allAttendance: Database["public"]["Tables"]["attendance"]["Row"][];
  weeklyAttendance: Database["public"]["Tables"]["attendance"]["Row"][];
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>;
  getMemberName: (userId: string) => string;
}

export const AttendanceTab = ({ allAttendance, weeklyAttendance, profileMap, getMemberName }: AttendanceTabProps) => {
  const attendanceChartData = (() => {
    if (weeklyAttendance.length === 0) return [];
    const byDate = new Map<string, { total: number; late: number; onTime: number }>();
    weeklyAttendance.forEach(a => {
      const d = a.date;
      if (!byDate.has(d)) byDate.set(d, { total: 0, late: 0, onTime: 0 });
      const entry = byDate.get(d)!;
      entry.total++;
      if (a.check_in && new Date(a.check_in).getHours() >= 9) entry.late++;
      else entry.onTime++;
    });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), ...v }));
  })();

  return (
    <div className="space-y-4">
      {attendanceChartData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="onTime" fill="hsl(var(--primary))" name="On Time" stackId="a" />
                <Bar dataKey="late" fill="hsl(var(--destructive))" name="Late" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records today.</p>
          ) : (
            <div className="space-y-2">
              {allAttendance.map((a) => {
                const prof = profileMap.get(a.user_id);
                const isLate = a.check_in && new Date(a.check_in).getHours() >= 9;
                return (
                  <div 
                    key={a.id} 
                    className={`flex items-center justify-between p-3 rounded-lg gap-2 flex-wrap ${isLate ? "bg-warning/10 border border-warning/20" : "bg-muted/30"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {prof?.avatar_url && <AvatarImage src={prof.avatar_url} />}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(prof?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{prof?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          In: {a.check_in ? new Date(a.check_in).toLocaleTimeString() : "—"}
                          {a.check_out && ` · Out: ${new Date(a.check_out).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLate && <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Late</Badge>}
                      <Badge variant="outline" className={`text-[10px] ${a.check_out ? "text-primary" : "text-warning"}`}>
                        {a.check_out ? "Complete" : "Active"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
