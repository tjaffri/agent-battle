import { useEffect, useRef, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import type { Message, LLMProvider } from "../types";
import { cn } from "../lib/utils";
import { MessageCircle, Bot, Sparkles, Brain } from "lucide-react";

const providerIcons: Record<LLMProvider, typeof Bot> = {
  openai: Bot,
  gemini: Sparkles,
  anthropic: Brain,
};

const providerColors: Record<LLMProvider, string> = {
  openai: "bg-openai",
  gemini: "bg-gemini",
  anthropic: "bg-anthropic",
};

interface ModelInfo {
  provider: LLMProvider;
  modelId: string;
  name: string;
}

interface ConsolidatedChatWindowProps {
  messages: Message[];
  question: string;
  models: ModelInfo[];
}

export function ConsolidatedChatWindow({
  messages,
  question,
  models,
}: ConsolidatedChatWindowProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Create a map of provider to model name for display
  const providerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    models.forEach((m) => {
      map[m.provider] = m.name;
    });
    return map;
  }, [models]);

  // Determine which provider goes left (first model) and which goes right (second model)
  const leftProvider = models[0]?.provider || "openai";
  const rightProvider = models[1]?.provider || "gemini";

  // Sort messages chronologically by round, then by timestamp within round
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      // First sort by round number
      if (a.roundNumber !== b.roundNumber) {
        return a.roundNumber - b.roundNumber;
      }
      // Then by timestamp within the same round
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [messages]);

  // Group messages by round for dividers
  const messagesWithDividers = useMemo(() => {
    const result: Array<
      { type: "divider"; round: number } | { type: "message"; message: Message }
    > = [];
    let currentRound = -1;

    for (const message of sortedMessages) {
      if (message.roundNumber !== currentRound) {
        currentRound = message.roundNumber;
        result.push({ type: "divider", round: currentRound });
      }
      result.push({ type: "message", message });
    }

    return result;
  }, [sortedMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages.length]);

  const getAlignment = (provider: LLMProvider): "left" | "right" => {
    return provider === leftProvider ? "left" : "right";
  };

  const LeftIcon = providerIcons[leftProvider] || Bot;
  const RightIcon = providerIcons[rightProvider] || Sparkles;

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border">
      <CardHeader className="pb-3 flex-shrink-0 border-b border-border bg-gradient-to-r from-card to-muted/30">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <span className="text-foreground">Debate Results</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  providerColors[leftProvider]
                )}
              >
                <LeftIcon className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">
                {providerNameMap[leftProvider] || leftProvider}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">vs</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {providerNameMap[rightProvider] || rightProvider}
              </span>
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  providerColors[rightProvider]
                )}
              >
                <RightIcon className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 bg-card">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4 space-y-3">
            {/* Question at top */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 mb-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Original Question
              </p>
              <p className="text-sm text-foreground">{question}</p>
            </div>

            {/* Messages with round dividers */}
            {messagesWithDividers.map((item) => {
              if (item.type === "divider") {
                return (
                  <div
                    key={`divider-${item.round}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground px-2">
                      Round {item.round + 1}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                );
              }

              const message = item.message;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  alignment={getAlignment(message.provider)}
                  showProviderLabel
                  providerName={providerNameMap[message.provider]}
                />
              );
            })}

            {/* Scroll anchor */}
            <div ref={scrollAnchorRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
