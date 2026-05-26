import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface UseAiAssistantOptions {
  context: string;
}

export const useAiAssistant = ({ context }: UseAiAssistantOptions) => {
  const { session, activeOrganizationId, user } = useAuth();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (prompt: string, data?: unknown) => {
    setLoading(true);
    setResponse("");
    setError(null);

    if (!session?.access_token) {
      setLoading(false);
      setError("You must be signed in to use AI assistance.");
      return;
    }

    try {
      let organizationId = activeOrganizationId;

      if (!organizationId && user?.id) {
        const [{ data: membership }, { data: profile }] = await Promise.all([
          supabase
            .from("organization_memberships")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        organizationId = membership?.organization_id ?? profile?.organization_id ?? null;
      }

      if (!organizationId) {
        throw new Error("No active organization. Please contact an administrator.");
      }

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ context, prompt, data, organization_id: organizationId }),
      });

      const respClone = resp.clone();

      if (!resp.ok) {
        const errData = await resp.json().catch(async () => ({ error: await respClone.text().catch(() => "AI service error") }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json") && !contentType.includes("text/event-stream")) {
        const payload = await resp.json().catch(() => null);
        const fullText = payload?.choices?.[0]?.message?.content
          || payload?.choices?.[0]?.delta?.content
          || payload?.response
          || payload?.content
          || null;

        if (!fullText) throw new Error("AI service returned an empty response.");
        setResponse(fullText);
        return;
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResponse(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResponse(accumulated);
            }
          } catch { /* ignore */ }
        }
      }

      if (!accumulated.trim()) {
        const fallbackText = await respClone.text().catch(() => "");
        if (fallbackText) {
          try {
            const payload = JSON.parse(fallbackText);
            const fullText = payload?.choices?.[0]?.message?.content
              || payload?.choices?.[0]?.delta?.content
              || payload?.response
              || payload?.content
              || null;
            if (fullText) {
              setResponse(fullText);
              return;
            }
          } catch {
            if (!fallbackText.trim().startsWith("data:")) {
              setResponse(fallbackText.trim());
              return;
            }
          }
        }

        throw new Error("AI service returned an empty response.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [context, session?.access_token, activeOrganizationId, user?.id]);

  const reset = useCallback(() => {
    setResponse("");
    setError(null);
  }, []);

  return { response, loading, error, ask, reset };
};
