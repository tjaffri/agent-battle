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
    <Card
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all",
        isOpenAI ? "border-emerald-200" : "border-blue-200"
      )}
    >
      <CardHeader
        className={cn(
          "pb-3 flex-shrink-0",
          isOpenAI ? "bg-emerald-50" : "bg-blue-50"
        )}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          {isOpenAI ? (
            <Bot className="w-5 h-5 text-emerald-600" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-600" />
          )}
          <span className={isOpenAI ? "text-emerald-700" : "text-blue-700"}>
            {title}
          </span>
          {isActive && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    isOpenAI ? "bg-emerald-400" : "bg-blue-400"
                  )}
                ></span>
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isOpenAI ? "bg-emerald-500" : "bg-blue-500"
                  )}
                ></span>
              </span>
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {filteredMessages.length === 0 && !isActive && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">
                  {isOpenAI ? "GPT-4o" : "Gemini 2.0"} responses will appear
                  here
                </p>
              </div>
            )}
            {filteredMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isActive && filteredMessages.length > 0 && (
              <div
                className={cn(
                  "p-4 rounded-xl animate-thinking",
                  isOpenAI
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-blue-50 border border-blue-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-emerald-400" : "bg-blue-400"
                      )}
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-emerald-400" : "bg-blue-400"
                      )}
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full animate-bounce",
                        isOpenAI ? "bg-emerald-400" : "bg-blue-400"
                      )}
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Thinking...
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
