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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const MAX_RADIUS_METERS = 500;

/** Check if current Nigeria time is past 5:00 PM */
const isPast5pmNigeria = () => {
  const now = new Date();
  const nigeriaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  return nigeriaTime.getHours() >= 17;
};

export const CheckInWidget = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ userLat: number; userLng: number; officeLat: number; officeLng: number; distance: number } | null>(null);

  // Fetch dynamic office coordinates from organization
  const { data: orgData } = useQuery({
    queryKey: ["org-coords", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("organizations").select("office_lat, office_lng").eq("id", orgId).single();
      return data;
    },
    enabled: !!orgId,
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

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
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
  };

  const handleCheckIn = async () => {
    if (!orgId || !user) return;

    // BLOCK if office coordinates not configured
    if (!officeConfigured) {
      toast({
        title: "Office location not configured",
        description: "Please ask an administrator to set the office coordinates in Settings.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      const officeLat = Number(orgData!.office_lat);
      const officeLng = Number(orgData!.office_lng);

      const distance = haversineDistance(latitude, longitude, officeLat, officeLng);

      // Set debug info
      setDebugInfo({ userLat: latitude, userLng: longitude, officeLat, officeLng, distance });

      if (distance > MAX_RADIUS_METERS) {
        toast({
          title: "Check-in denied",
          description: `You are ${Math.round(distance)}m from the office. Must be within ${MAX_RADIUS_METERS}m.`,
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
        toast({ title: "Checked in!", description: `Location verified (${Math.round(distance)}m from office).` });
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

    // Enforce 5PM checkout in Nigeria time
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
      const position = await getLocation();
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
              {!officeConfigured && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                  <AlertCircle className="h-3 w-3" /> Office location not configured
                </p>
              )}
              {!todayAttendance?.check_out && todayAttendance?.check_in && !isPast5pmNigeria() && (
                <p className="text-xs text-muted-foreground mt-0.5">Checkout available at 5:00 PM</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!todayAttendance ? (
              <Button size="sm" onClick={handleCheckIn} disabled={loading || !officeConfigured}>
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
            <p>🏢 Office: {debugInfo.officeLat.toFixed(6)}, {debugInfo.officeLng.toFixed(6)}</p>
            <p>📏 Distance: {Math.round(debugInfo.distance)}m (max {MAX_RADIUS_METERS}m)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
