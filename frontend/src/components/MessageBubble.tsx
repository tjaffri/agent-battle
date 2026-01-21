import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import type { Message, LLMProvider } from "../types";

interface MessageBubbleProps {
  message: Message;
}

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

export function MessageBubble({ message }: MessageBubbleProps) {
  const provider = message.provider;

  return (
    <div
      className={cn(
        "p-4 rounded border transition-all",
        providerBgStyles[provider],
        message.isCritique && "border-l-4",
        message.isCritique && providerBorderStyles[provider]
      )}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
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
      </div>
      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
