import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Sparkles, Loader2, Brain } from "lucide-react";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { stripMarkdown } from "@/lib/stripMarkdown";

interface AiInsightPanelProps {
  context: string;
  title?: string;
  suggestions?: string[];
  data?: unknown;
}

export const AiInsightPanel = ({ context, title = "AI Assistant", suggestions = [], data }: AiInsightPanelProps) => {
  const [prompt, setPrompt] = useState("");
  const { response, loading, error, ask, reset } = useAiAssistant({ context });

  // Auto-fetch latest AI summary for this context
  const { data: autoInsight, isLoading: insightLoading } = useQuery({
    queryKey: ["ai-auto-insight", context],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("context", context)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const handleAsk = (text?: string) => {
    const q = text || prompt;
    if (!q.trim()) return;
    ask(q, data);
    setPrompt("");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Auto-loaded insight */}
        {insightLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading insights...
          </div>
        )}
        {autoInsight && !response && !loading && (
          <div className="bg-background rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
            {stripMarkdown(autoInsight.summary)}
            <p className="text-xs text-muted-foreground mt-2">Auto-generated · {new Date(autoInsight.created_at).toLocaleDateString()}</p>
          </div>
        )}

        {/* Quick suggestion chips */}
        {suggestions.length > 0 && !response && !loading && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors text-xs"
                onClick={() => handleAsk(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* Manual response */}
        {(response || loading) && (
          <div className="bg-background rounded-lg p-3 text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
            {(response ? stripMarkdown(response) : null) || (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Manual query input */}
        <div className="flex gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="min-h-[40px] h-10 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <Button size="icon" className="shrink-0 h-10 w-10" onClick={() => handleAsk()} disabled={loading || !prompt.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
