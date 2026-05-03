
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useSignedUrl = (bucket: string, path: string | null, expiresIn = 3600) => {
  return useQuery({
    queryKey: ["signed-url", bucket, path, expiresIn],
    queryFn: async () => {
      if (!path) return null;
      // If it's already a full URL (possibly signed from a previous session or public), return it
      if (path.startsWith("http")) return path;
      
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: (expiresIn - 60) * 1000, // Refresh before expiry
  });
};
