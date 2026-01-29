import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import type { Message, LLMProvider } from "../types";
import { Bot, Sparkles, Brain } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  alignment?: "left" | "right";
  showProviderLabel?: boolean;
  providerName?: string;
}

const providerIcons: Record<LLMProvider, typeof Bot> = {
  openai: Bot,
  gemini: Sparkles,
  anthropic: Brain,
};

const providerIconBgColors: Record<LLMProvider, string> = {
  openai: "bg-openai",
  gemini: "bg-gemini",
  anthropic: "bg-anthropic",
};

const providerBgStyles: Record<LLMProvider, string> = {
  openai: "bg-openai/5 border-openai/20",
  gemini: "bg-gemini/5 border-gemini/20",
  anthropic: "bg-anthropic/5 border-anthropic/20",
};

const providerBorderStyles: Record<LLMProvider, string> = {
  openai: "border-l-openai",
  gemini: "border-l-gemini",
  anthropic: "border-l-anthropic",
};

const providerBadgeStyles: Record<LLMProvider, string> = {
  openai: "bg-openai/10 text-openai",
  gemini: "bg-gemini/10 text-gemini",
  anthropic: "bg-anthropic/10 text-anthropic",
};

export function MessageBubble({
  message,
  alignment,
  showProviderLabel,
  providerName,
}: MessageBubbleProps) {
  const provider = message.provider;
  const IconComponent = providerIcons[provider] || Bot;

  // Consolidated view styling (with alignment)
  if (alignment) {
    const isRight = alignment === "right";
    return (
      <div
        className={cn("flex", isRight ? "justify-end" : "justify-start")}
        data-testid={`message-${message.id}`}
      >
        <div
          className={cn(
            "max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl border transition-all",
            providerBgStyles[provider],
            isRight ? "rounded-br-sm" : "rounded-bl-sm",
            message.isStreaming && "ring-1 ring-offset-1 ring-primary/30"
          )}
        >
          {showProviderLabel && (
            <div
              className={cn(
                "flex items-center gap-1.5 mb-2",
                isRight ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                  providerIconBgColors[provider]
                )}
              >
                <IconComponent className="w-3 h-3 text-white" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  providerBadgeStyles[provider]
                )}
              >
                {providerName || provider}
              </span>
            </div>
          )}
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default view styling (original)
  return (
    <div
      className={cn(
        "p-3 sm:p-4 rounded border transition-all",
        providerBgStyles[provider],
        message.isCritique && "border-l-4",
        message.isCritique && providerBorderStyles[provider],
        message.isStreaming && "ring-1 ring-offset-1 ring-primary/30"
      )}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <span
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded",
            providerBadgeStyles[provider]
          )}
        >
          {message.isCritique ? "Critique" : "Response"}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          Round {message.roundNumber + 1}
        </span>
        {message.isStreaming && (
          <span className="text-xs text-muted-foreground animate-pulse">
            streaming...
          </span>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
