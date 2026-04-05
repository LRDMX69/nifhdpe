import { useEffect, useState } from "react";
import nifLogo from "@/assets/nif-logo.png";

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const done = setTimeout(onComplete, 2400);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      <img
        src={nifLogo}
        alt="NIF Technical"
        className="h-20 w-20 rounded-2xl object-contain animate-pulse mb-6"
      />
      <h1 className="text-2xl font-bold text-foreground tracking-tight">NIF Technical</h1>
      <p className="text-sm text-muted-foreground mt-1">Operations Suite</p>
      <div className="mt-8 h-1 w-32 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out]" />
      </div>
    </div>
  );
};
