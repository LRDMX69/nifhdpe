import { Clock, CheckCircle, MapPin, Loader2 } from "lucide-react";
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

const MAX_RADIUS_METERS = 500; // 500m radius

export const CheckInWidget = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [loading, setLoading] = useState(false);

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

  const OFFICE_COORDS = {
    lat: orgData?.office_lat ?? 6.5244,
    lng: orgData?.office_lng ?? 3.3792,
  };

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
    setLoading(true);

    try {
      // Get GPS location
      const position = await getLocation();
      const { latitude, longitude } = position.coords;

      // Check distance from office
      const distance = haversineDistance(latitude, longitude, OFFICE_COORDS.lat, OFFICE_COORDS.lng);

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
        toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
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
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!todayAttendance ? (
              <Button size="sm" onClick={handleCheckIn} disabled={loading}>
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
      </CardContent>
    </Card>
  );
};
