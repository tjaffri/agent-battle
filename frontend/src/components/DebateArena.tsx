import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChatWindow } from "./ChatWindow";
import { MobileChatTabs } from "./MobileChatTabs";
import { ConsolidatedChatWindow } from "./ConsolidatedChatWindow";
import { DebateSettings } from "./DebateSettings";
import { useDebate } from "../hooks/useDebate";
import { Send, Square, RotateCcw, Zap } from "lucide-react";
import type { LLMProvider } from "../types";

// Model display names - Updated January 2025
const MODEL_NAMES: Record<string, string> = {
  // OpenAI
  o3: "o3",
  "o4-mini": "o4-mini",
  "gpt-4.1": "GPT-4.1",
  "gpt-4.1-mini": "GPT-4.1 Mini",
  "gpt-4o": "GPT-4o",
  // Gemini
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  // Anthropic
  "claude-opus-4-5-20251124": "Claude Opus 4.5",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "claude-haiku-4-5-20251015": "Claude Haiku 4.5",
};

export function DebateArena() {
  const [question, setQuestion] = useState("");
  const { state, startDebate, stopDebate, resetDebate, updateConfig } =
    useDebate();

  // Get the model names for display
  const modelDisplayInfo = useMemo(() => {
    return state.config.models.map((m) => ({
      provider: m.provider as LLMProvider,
      modelId: m.model_id,
      name: MODEL_NAMES[m.model_id] || m.model_id,
    }));
  }, [state.config.models]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !state.isActive) {
      startDebate(question.trim(), state.config);
    }
  };

  const handleReset = () => {
    setQuestion("");
    resetDebate();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header - UiPath style with orange accent */}
      <header className="bg-secondary text-white px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded flex items-center justify-center">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                Agent Battle
              </h1>
              <p className="text-xs sm:text-sm text-white/70">
                {modelDisplayInfo[0]?.name || "GPT-4o"} vs{" "}
                {modelDisplayInfo[1]?.name || "Gemini 2.0"} — AI Debate Arena
              </p>
            </div>
          </div>
          {state.messages.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-semibold">
                  Round {state.roundNumber + 1}{" "}
                  <span className="text-base sm:text-lg text-white/60">
                    / {state.maxRounds}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-white/60">
                  {state.messages.length} messages
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Question Input - Clean UiPath style */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-4 sm:py-5">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask a question to start the debate...`}
            disabled={state.isActive}
            className="flex-1 h-12 text-base border-border focus:border-primary focus:ring-primary"
            data-testid="question-input"
          />
          <div className="flex gap-2 sm:gap-3">
            {state.isActive ? (
              <Button
                type="button"
                onClick={stopDebate}
                variant="destructive"
                size="lg"
                className="flex-1 sm:flex-initial h-12 px-4 sm:px-6 rounded"
                data-testid="stop-button"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Debate
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  disabled={!question.trim()}
                  size="lg"
                  className="flex-1 sm:flex-initial h-12 px-4 sm:px-6 bg-primary hover:bg-primary-hover text-white rounded font-medium"
                  data-testid="start-button"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Start Debate
                </Button>
                {state.messages.length > 0 && (
                  <Button
                    type="button"
                    onClick={handleReset}
                    variant="outline"
                    size="lg"
                    className="h-12 px-4 rounded border-border hover:bg-muted"
                    data-testid="reset-button"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </form>
        {state.question && (
          <div className="max-w-4xl mx-auto mt-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Question:</span>{" "}
              {state.question}
            </p>
          </div>
        )}
        {state.error && (
          <div className="max-w-4xl mx-auto mt-4">
            <p className="text-sm text-destructive">
              <span className="font-medium">Error:</span> {state.error}
            </p>
          </div>
        )}
        {/* Settings Panel */}
        <div className="max-w-4xl mx-auto mt-4">
          <DebateSettings
            config={state.config}
            onConfigChange={updateConfig}
            disabled={state.isActive}
          />
        </div>
      </div>

      {/* Show consolidated view when debate is stopped with messages */}
      {!state.isActive && state.messages.length > 0 ? (
        <div className="flex-1 p-2 sm:p-4 bg-background min-h-0 overflow-hidden">
          <ConsolidatedChatWindow
            messages={state.messages}
            question={state.question}
            models={modelDisplayInfo}
          />
        </div>
      ) : (
        <>
          {/* Desktop: Side-by-side Chat Windows */}
          <div className="hidden md:grid flex-1 grid-cols-2 gap-4 p-4 bg-background min-h-0 overflow-hidden">
            <ChatWindow
              provider={modelDisplayInfo[0]?.provider || "openai"}
              messages={state.messages}
              title={modelDisplayInfo[0]?.name || "GPT-4o"}
              isActive={state.isActive}
            />
            <ChatWindow
              provider={modelDisplayInfo[1]?.provider || "gemini"}
              messages={state.messages}
              title={modelDisplayInfo[1]?.name || "Gemini 2.0"}
              isActive={state.isActive}
            />
          </div>

          {/* Mobile: Tabbed Chat Windows */}
          <div className="flex md:hidden flex-1 flex-col p-2 sm:p-4 bg-background min-h-0 overflow-hidden">
            <MobileChatTabs
              models={modelDisplayInfo}
              messages={state.messages}
              isActive={state.isActive}
            />
          </div>
        </>
      )}

      {/* Footer - Clean UiPath style */}
      <footer className="bg-card border-t border-border px-4 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <span
            className={`font-medium text-${modelDisplayInfo[0]?.provider || "openai"}`}
          >
            {modelDisplayInfo[0]?.name || "GPT-4o"}
          </span>{" "}
          &{" "}
          <span
            className={`font-medium text-${modelDisplayInfo[1]?.provider || "gemini"}`}
          >
            {modelDisplayInfo[1]?.name || "Gemini 2.0"}
          </span>
          <span className="hidden sm:inline"> | Built with LangGraph</span>
        </p>
      </footer>
    </div>
  );
}
