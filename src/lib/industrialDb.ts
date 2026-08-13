import { supabase } from "@/integrations/supabase/client";

// The generated Supabase types predate the additive industrial-foundation migration.
// Keep this adapter narrow until types are regenerated from the deployed schema.
export const industrialDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export type IndustrialRow = Record<string, any>;
