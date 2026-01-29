import { useState } from "react";
import { ChatWindow } from "./ChatWindow";
import type { Message, LLMProvider } from "../types";
import { cn } from "../lib/utils";
import { Bot, Sparkles, Brain } from "lucide-react";

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

const providerLightColors: Record<LLMProvider, string> = {
  openai: "bg-openai/10 text-openai",
  gemini: "bg-gemini/10 text-gemini",
  anthropic: "bg-anthropic/10 text-anthropic",
};

interface ModelDisplayInfo {
  provider: LLMProvider;
  modelId: string;
  name: string;
}

interface MobileChatTabsProps {
  models: ModelDisplayInfo[];
  messages: Message[];
  isActive: boolean;
}

export function MobileChatTabs({
  models,
  messages,
  isActive,
}: MobileChatTabsProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const getMessageCount = (provider: LLMProvider) => {
    return messages.filter((m) => m.provider === provider).length;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="flex gap-2 mb-2">
        {models.map((model, index) => {
          const IconComponent = providerIcons[model.provider] || Bot;
          const messageCount = getMessageCount(model.provider);
          const isActiveTab = activeTab === index;

          return (
            <button
              key={model.modelId}
              onClick={() => setActiveTab(index)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg border transition-all",
                "min-h-[44px] px-3 py-2",
                isActiveTab
                  ? cn(
                      providerColors[model.provider],
                      "text-white border-transparent"
                    )
                  : cn(providerLightColors[model.provider], "border-current/20")
              )}
            >
              <IconComponent className="w-4 h-4" />
              <span className="text-sm font-medium truncate">{model.name}</span>
              {messageCount > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    isActiveTab ? "bg-white/20" : "bg-current/10"
                  )}
                >
                  {messageCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active chat window */}
      <div className="flex-1 min-h-0">
        <ChatWindow
          provider={models[activeTab]?.provider || "openai"}
          messages={messages}
          title={models[activeTab]?.name || "AI"}
          isActive={isActive}
        />
      </div>
    </div>
  );
}
