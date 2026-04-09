import { Clock, CheckCircle, MapPin, Loader2, AlertCircle, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

/** Haversine distance in meters */
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DEFAULT_RADIUS = 500;

/** Check if current Nigeria time is past 5:00 PM */
const isPast5pmNigeria = () => {
  const now = new Date();
  const nigeriaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  return nigeriaTime.getHours() >= 17;
};

interface DebugInfo {
  userLat: number;
  userLng: number;
  targetLat: number;
  targetLng: number;
  distance: number;
  zone: string;
}

export const CheckInWidget = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Fetch office coordinates
  const { data: orgData } = useQuery({
    queryKey: ["org-coords", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("organizations").select("office_lat, office_lng").eq("id", orgId).single();
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch projects user is assigned to (as head or team member)
  const { data: assignedProjects = [] } = useQuery({
    queryKey: ["assigned-projects-checkin", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, project_lat, project_lng, radius_meters, project_head_id, team_member_ids, status")
        .eq("organization_id", orgId)
        .in("status", ["planning", "in_progress"]);
      if (!data) return [];
      // Filter to projects where user is head or team member
      return data.filter((p: any) => {
        if (p.project_head_id === user.id) return true;
        if (Array.isArray(p.team_member_ids) && p.team_member_ids.includes(user.id)) return true;
        return false;
      }).filter((p: any) => p.project_lat != null && p.project_lng != null);
    },
    enabled: !!orgId && !!user,
  });

  // Check for today's holiday
  const { data: todayHoliday } = useQuery({
    queryKey: ["holiday-today", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("holidays")
        .select("*")
        .eq("organization_id", orgId)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!orgId,
  });

  const officeConfigured = orgData?.office_lat != null && orgData?.office_lng != null;
  const hasAnyLocation = officeConfigured || assignedProjects.length > 0;

  const { data: todayAttendance, refetch } = useQuery({
    queryKey: ["attendance-today", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!orgId && !!user,
  });

  const getLocation = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your device"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

  /** Find the closest valid zone (office or project site) */
  const findClosestZone = (lat: number, lng: number): { zone: string; targetLat: number; targetLng: number; distance: number; radius: number } | null => {
    const zones: { zone: string; targetLat: number; targetLng: number; radius: number; distance: number }[] = [];

    // Add office
    if (officeConfigured) {
      const oLat = Number(orgData!.office_lat);
      const oLng = Number(orgData!.office_lng);
      zones.push({
        zone: "Office",
        targetLat: oLat,
        targetLng: oLng,
        radius: DEFAULT_RADIUS,
        distance: haversineDistance(lat, lng, oLat, oLng),
      });
    }

    // Add project sites
    for (const p of assignedProjects) {
      const pLat = Number((p as any).project_lat);
      const pLng = Number((p as any).project_lng);
      const radius = (p as any).radius_meters || DEFAULT_RADIUS;
      zones.push({
        zone: `Project: ${(p as any).name}`,
        targetLat: pLat,
        targetLng: pLng,
        radius,
        distance: haversineDistance(lat, lng, pLat, pLng),
      });
    }

    if (zones.length === 0) return null;

    // Find closest zone within radius
    const withinRadius = zones.filter(z => z.distance <= z.radius);
    if (withinRadius.length > 0) {
      return withinRadius.sort((a, b) => a.distance - b.distance)[0];
    }

    // Return closest even if out of radius (for error message)
    return zones.sort((a, b) => a.distance - b.distance)[0];
  };

  const handleCheckIn = async () => {
    if (!orgId || !user) return;

    if (!hasAnyLocation) {
      toast({
        title: "No check-in location configured",
        description: "Office coordinates or project site locations must be set by an administrator.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;

      const closest = findClosestZone(latitude, longitude);
      if (!closest) {
        toast({ title: "No location configured", description: "Contact admin.", variant: "destructive" });
        return;
      }

      setDebugInfo({
        userLat: latitude,
        userLng: longitude,
        targetLat: closest.targetLat,
        targetLng: closest.targetLng,
        distance: closest.distance,
        zone: closest.zone,
      });

      if (closest.distance > closest.radius) {
        toast({
          title: "Check-in denied",
          description: `You are ${Math.round(closest.distance)}m from ${closest.zone}. Must be within ${closest.radius}m.`,
          variant: "destructive",
        });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("attendance").insert({
        organization_id: orgId,
        user_id: user.id,
        date: today,
        check_in: new Date().toISOString(),
        status: "present",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already checked in", description: "You have already checked in today.", variant: "destructive" });
        } else {
          toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Checked in!", description: `${closest.zone} verified (${Math.round(closest.distance)}m).` });
        refetch();
      }
    } catch (err: any) {
      if (err.code === 1) {
        toast({ title: "Location required", description: "Please enable GPS/location to check in.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;

    if (!isPast5pmNigeria()) {
      toast({
        title: "Checkout not available yet",
        description: "Checkout is only allowed after 5:00 PM (Nigeria time).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await getLocation(); // Still require GPS for checkout
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", todayAttendance.id);
      if (error) {
        toast({ title: "Check-out failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Checked out!" });
        refetch();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Holiday screen
  if (todayHoliday) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">🎉 Happy {todayHoliday.name}!</p>
              <p className="text-xs text-muted-foreground">Today is a company holiday. Attendance is disabled.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Today's Attendance</p>
              <p className="text-xs text-muted-foreground truncate">
                {todayAttendance?.check_in
                  ? `In: ${new Date(todayAttendance.check_in).toLocaleTimeString()}`
                  : "Not checked in"}
                {todayAttendance?.check_out && ` · Out: ${new Date(todayAttendance.check_out).toLocaleTimeString()}`}
              </p>
              {!hasAnyLocation && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                  <AlertCircle className="h-3 w-3" /> No check-in location configured
                </p>
              )}
              {assignedProjects.length > 0 && !todayAttendance && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {assignedProjects.length} project site(s) available
                </p>
              )}
              {!todayAttendance?.check_out && todayAttendance?.check_in && !isPast5pmNigeria() && (
                <p className="text-xs text-muted-foreground mt-0.5">Checkout available at 5:00 PM</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!todayAttendance ? (
              <Button size="sm" onClick={handleCheckIn} disabled={loading || !hasAnyLocation}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                Check In
              </Button>
            ) : !todayAttendance.check_out ? (
              <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Check Out
              </Button>
            ) : (
              <span className="text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-lg">Complete ✓</span>
            )}
          </div>
        </div>

        {/* Debug GPS info */}
        {debugInfo && (
          <div className="mt-3 p-2 rounded bg-muted/50 text-[10px] font-mono text-muted-foreground space-y-0.5">
            <p>📍 You: {debugInfo.userLat.toFixed(6)}, {debugInfo.userLng.toFixed(6)}</p>
            <p>🏢 {debugInfo.zone}: {debugInfo.targetLat.toFixed(6)}, {debugInfo.targetLng.toFixed(6)}</p>
            <p>📏 Distance: {Math.round(debugInfo.distance)}m</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
