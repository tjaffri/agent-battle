import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import type { Message, LLMProvider } from "../types";
import { cn } from "../lib/utils";
import { Sparkles, Bot, Brain } from "lucide-react";

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

const providerBgColors: Record<LLMProvider, string> = {
  openai: "bg-openai/5",
  gemini: "bg-gemini/5",
  anthropic: "bg-anthropic/5",
};

const providerBorderColors: Record<LLMProvider, string> = {
  openai: "border-openai/20",
  gemini: "border-gemini/20",
  anthropic: "border-anthropic/20",
};

const providerTextColors: Record<LLMProvider, string> = {
  openai: "text-openai",
  gemini: "text-gemini",
  anthropic: "text-anthropic",
};

interface ChatWindowProps {
  provider: LLMProvider;
  messages: Message[];
  title: string;
  isActive: boolean;
}

export function ChatWindow({
  provider,
  messages,
  title,
  isActive,
}: ChatWindowProps) {
  const filteredMessages = messages.filter((m) => m.provider === provider);
  const scrollRef = useRef<HTMLDivElement>(null);
  const IconComponent = providerIcons[provider] || Bot;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border">
      <CardHeader
        className={cn(
          "pb-3 flex-shrink-0 border-b border-border",
          providerBgColors[provider]
        )}
      >
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center",
              providerColors[provider]
            )}
          >
            <IconComponent className="w-4 h-4 text-white" />
          </div>
          <span className="text-foreground">{title}</span>
          {isActive && (
            <span className="ml-auto flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    providerColors[provider]
                  )}
                ></span>
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    providerColors[provider]
                  )}
                ></span>
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                Thinking...
              </span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 bg-card">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-3">
            {filteredMessages.length === 0 && !isActive && (
              <div className="text-center text-muted-foreground py-12">
                <div
                  className={cn(
                    "w-12 h-12 rounded mx-auto mb-3 flex items-center justify-center opacity-50",
                    providerBgColors[provider]
                  )}
                >
                  <IconComponent
                    className={cn("w-6 h-6", providerTextColors[provider])}
                  />
                </div>
                <p className="text-sm">{title} responses will appear here</p>
              </div>
            )}
            {filteredMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isActive && filteredMessages.length > 0 && (
              <div
                className={cn(
                  "p-4 rounded border animate-thinking",
                  providerBgColors[provider],
                  providerBorderColors[provider]
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        providerColors[provider]
                      )}
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        providerColors[provider]
                      )}
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        providerColors[provider]
                      )}
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Generating response...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
