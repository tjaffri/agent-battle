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
        "p-4 rounded-xl transition-all",
        isOpenAI
          ? "bg-emerald-50 border border-emerald-200"
          : "bg-blue-50 border border-blue-200",
        message.isCritique && "border-l-4",
        message.isCritique && isOpenAI && "border-l-emerald-500",
        message.isCritique && !isOpenAI && "border-l-blue-500"
      )}
      data-testid={`message-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isOpenAI
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          )}
        >
          {message.isCritique ? "Critique" : "Response"}
        </span>
        <span className="text-xs text-muted-foreground">
          Round {message.roundNumber + 1}
        </span>
      </div>
      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}
