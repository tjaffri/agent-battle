import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatWindow } from "./ChatWindow";
import { useDebate } from "@/hooks/useDebate";
import { Send, Square, RotateCcw, Zap } from "lucide-react";

export function DebateArena() {
  const [question, setQuestion] = useState("");
  const { state, startDebate, stopDebate, resetDebate } = useDebate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !state.isActive) {
      startDebate(question.trim());
    }
  };

  const handleReset = () => {
    setQuestion("");
    resetDebate();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header - UiPath style with orange accent */}
      <header className="bg-secondary text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Agent Battle
              </h1>
              <p className="text-sm text-white/70">
                GPT-4o vs Gemini 2.0 — AI Debate Arena
              </p>
            </div>
          </div>
          {state.messages.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-semibold">
                  Round {state.roundNumber + 1}
                </p>
                <p className="text-sm text-white/60">
                  {state.messages.length} messages
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Question Input - Clean UiPath style */}
      <div className="bg-card border-b border-border px-6 py-5">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex gap-3 items-center"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question to start the debate between GPT-4o and Gemini..."
            disabled={state.isActive}
            className="flex-1 h-12 text-base border-border focus:border-primary focus:ring-primary"
            data-testid="question-input"
          />
          {state.isActive ? (
            <Button
              type="button"
              onClick={stopDebate}
              variant="destructive"
              size="lg"
              className="h-12 px-6 rounded"
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
                className="h-12 px-6 bg-primary hover:bg-primary-hover text-white rounded font-medium"
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
                  className="h-12 rounded border-border hover:bg-muted"
                  data-testid="reset-button"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
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
      </div>

      {/* Side-by-side Chat Windows */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 bg-background min-h-0 overflow-hidden">
        <ChatWindow
          provider="openai"
          messages={state.messages}
          title="GPT-4o"
          isActive={state.isActive}
        />
        <ChatWindow
          provider="gemini"
          messages={state.messages}
          title="Gemini 2.0"
          isActive={state.isActive}
        />
      </div>

      {/* Footer - Clean UiPath style */}
      <footer className="bg-card border-t border-border px-6 py-3 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <a
            href="https://openai.com"
            className="font-medium text-openai hover:underline"
          >
            OpenAI GPT-4o
          </a>{" "}
          &{" "}
          <a
            href="https://deepmind.google/technologies/gemini/"
            className="font-medium text-gemini hover:underline"
          >
            Google Gemini 2.0
          </a>{" "}
          | Built with LangGraph
        </p>
      </footer>
    </div>
  );
}
