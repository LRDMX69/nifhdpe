import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Compass className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-lg font-semibold">This page isn't part of the ERP</p>
          <p className="text-sm text-muted-foreground">
            The link you followed may be outdated, or the module you're looking for isn't available to your role.
            Head back to your dashboard or use the search palette (Ctrl/Cmd + K) to jump to a module.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild><Link to="/dashboard">Go to dashboard</Link></Button>
          <Button variant="outline" asChild><Link to="/messages">Contact a colleague</Link></Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
