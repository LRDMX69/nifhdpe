import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TARGETS: Record<string, string[]> = {
  "claim-attachments": [
    "a0000000-0000-0000-0000-000000000001/55e3487b-a04f-4546-8114-dcc645056bf7/1775813113836.jpg",
    "a0000000-0000-0000-0000-000000000001/a2380c46-d1ae-478d-b682-a5de085f4a73/1775999979769.jpg",
  ],
  "claims-proof": [
    "a0000000-0000-0000-0000-000000000001/55e3487b-a04f-4546-8114-dcc645056bf7/1777690256035.jpg",
  ],
  "compliance-docs": [
    "a0000000-0000-0000-0000-000000000001/1775912401899-field-report---04_03_2026-937F82C0.pdf",
  ],
  "site-photos": [
    "73c8de66-aac5-4ffe-ba08-2b6db27c7b03/1771085561940-17710854502373065082888232736442.jpg",
    "73c8de66-aac5-4ffe-ba08-2b6db27c7b03/1771151591243-17711515726423483638438440062710.jpg",
    "a531e1b0-2605-4a5e-8426-7cf1f693b1a0/1780017843372-510492.png",
    "a531e1b0-2605-4a5e-8426-7cf1f693b1a0/offline-1780017843684-0.jpg",
  ],
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const results: Record<string, unknown> = {};
  for (const [bucket, paths] of Object.entries(TARGETS)) {
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    results[bucket] = error ? { error: error.message } : { removed: data?.length ?? 0 };
  }
  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
