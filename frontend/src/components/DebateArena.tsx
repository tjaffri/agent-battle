import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatWindow } from "./ChatWindow";
import { useDebate } from "@/hooks/useDebate";
import { Send, Square, RotateCcw, Swords } from "lucide-react";

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
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Agent Battle</h1>
              <p className="text-sm text-white/80">
                GPT-4o vs Gemini 2.0 - AI Debate Arena
              </p>
            </div>
          </div>
          {state.messages.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-white/80">
                Round {state.roundNumber + 1}
              </p>
              <p className="text-xs text-white/60">
                {state.messages.length} messages
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Question Input */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex gap-3 items-center"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question to start the debate between GPT-4o and Gemini..."
            disabled={state.isActive}
            className="flex-1 h-12 text-base"
            data-testid="question-input"
          />
          {state.isActive ? (
            <Button
              type="button"
              onClick={stopDebate}
              variant="destructive"
              size="lg"
              className="h-12 px-6"
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
                className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
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
                  className="h-12"
                  data-testid="reset-button"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </form>
        {state.question && (
          <div className="max-w-4xl mx-auto mt-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Question:</span> {state.question}
            </p>
          </div>
        )}
        {state.error && (
          <div className="max-w-4xl mx-auto mt-3">
            <p className="text-sm text-destructive">
              <span className="font-medium">Error:</span> {state.error}
            </p>
          </div>
        )}
      </div>

      {/* Side-by-side Chat Windows */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 bg-gray-50 min-h-0 overflow-hidden">
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

      {/* Footer */}
      <footer className="bg-white border-t px-6 py-3 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <span className="font-medium text-emerald-600">OpenAI GPT-4o</span> &{" "}
          <span className="font-medium text-blue-600">Google Gemini 2.0</span> |
          Built with LangGraph
        </p>
      </footer>
    </div>
  );
}
