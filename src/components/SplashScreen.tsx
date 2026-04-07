import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch org logo
    supabase
      .from("organizations")
      .select("logo_url, name")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const done = setTimeout(onComplete, 2400);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Company Logo"
          className="h-20 w-20 rounded-2xl object-contain animate-pulse mb-6"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse mb-6">
          <span className="text-3xl font-bold text-primary">N</span>
        </div>
      )}
      <h1 className="text-2xl font-bold text-foreground tracking-tight">NIF Technical</h1>
      <p className="text-sm text-muted-foreground mt-1">Operations Suite</p>
      <div className="mt-8 h-1 w-32 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out]" />
      </div>
    </div>
  );
};
