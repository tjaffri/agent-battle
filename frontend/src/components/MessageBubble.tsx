import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOpenAI = message.provider === "openai";

  return (
    <div
      className={cn(
        "p-4 rounded border transition-all",
        isOpenAI
          ? "bg-openai/5 border-openai/20"
          : "bg-gemini/5 border-gemini/20",
        message.isCritique && "border-l-4",
        message.isCritique && isOpenAI && "border-l-openai",
        message.isCritique && !isOpenAI && "border-l-gemini"
      )}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded",
            isOpenAI ? "bg-openai/10 text-openai" : "bg-gemini/10 text-gemini"
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
