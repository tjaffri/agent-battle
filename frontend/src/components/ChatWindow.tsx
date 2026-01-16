import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import type { Message, LLMProvider } from "@/types";
import { cn } from "@/lib/utils";
import { Sparkles, Bot } from "lucide-react";

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
  const isOpenAI = provider === "openai";

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
          isOpenAI ? "bg-openai/5" : "bg-gemini/5"
        )}
      >
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center",
              isOpenAI ? "bg-openai" : "bg-gemini"
            )}
          >
            {isOpenAI ? (
              <Bot className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-foreground">{title}</span>
          {isActive && (
            <span className="ml-auto flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    isOpenAI ? "bg-openai" : "bg-gemini"
                  )}
                ></span>
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isOpenAI ? "bg-openai" : "bg-gemini"
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
                    isOpenAI ? "bg-openai/10" : "bg-gemini/10"
                  )}
                >
                  {isOpenAI ? (
                    <Bot
                      className={cn(
                        "w-6 h-6",
                        isOpenAI ? "text-openai" : "text-gemini"
                      )}
                    />
                  ) : (
                    <Sparkles
                      className={cn(
                        "w-6 h-6",
                        isOpenAI ? "text-openai" : "text-gemini"
                      )}
                    />
                  )}
                </div>
                <p className="text-sm">
                  {isOpenAI ? "GPT-4o" : "Gemini 2.0"} responses will appear here
                </p>
              </div>
            )}
            {filteredMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isActive && filteredMessages.length > 0 && (
              <div
                className={cn(
                  "p-4 rounded border animate-thinking",
                  isOpenAI
                    ? "bg-openai/5 border-openai/20"
                    : "bg-gemini/5 border-gemini/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-openai" : "bg-gemini"
                      )}
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-openai" : "bg-gemini"
                      )}
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-openai" : "bg-gemini"
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
