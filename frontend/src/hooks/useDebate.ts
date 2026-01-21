import { useState, useCallback, useRef } from "react";
import type {
  DebateState,
  DebateConfig,
  DebateRequest,
  DebateResponse,
  Message,
  StreamEvent,
} from "../types";

// In production (Vercel), use relative /api path. In development, use localhost.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000");

const defaultConfig: DebateConfig = {
  maxRounds: 2,
  models: [
    { provider: "openai", model_id: "gpt-4.1" },
    { provider: "gemini", model_id: "gemini-2.5-flash" },
  ],
};

const initialState: DebateState = {
  sessionId: null,
  question: "",
  messages: [],
  isActive: false,
  roundNumber: 0,
  maxRounds: 2,
  error: null,
  config: defaultConfig,
};

export function useDebate() {
  const [state, setState] = useState<DebateState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    if (event.event_type === "message" && event.provider && event.content) {
      const newMessage: Message = {
        id: event.message_id || crypto.randomUUID(),
        provider: event.provider,
        content: event.content,
        timestamp: new Date(),
        isCritique: event.round_number > 0,
        roundNumber: event.round_number,
        modelId: event.model_id,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        roundNumber: event.round_number,
        maxRounds: event.max_rounds ?? prev.maxRounds,
      }));
    } else if (event.event_type === "round_start") {
      setState((prev) => ({
        ...prev,
        roundNumber: event.round_number,
        maxRounds: event.max_rounds ?? prev.maxRounds,
      }));
    } else if (event.event_type === "debate_end") {
      setState((prev) => ({
        ...prev,
        isActive: false,
      }));
    } else if (event.event_type === "error") {
      setState((prev) => ({
        ...prev,
        isActive: false,
        error: event.content,
      }));
    }
  }, []);

  const updateConfig = useCallback((config: DebateConfig) => {
    setState((prev) => ({
      ...prev,
      config,
      maxRounds: config.maxRounds,
    }));
  }, []);

  const startDebate = useCallback(
    async (question: string, config?: DebateConfig) => {
      const debateConfig = config || state.config;

      try {
        // Reset state and start new debate
        setState({
          ...initialState,
          question,
          isActive: true,
          config: debateConfig,
          maxRounds: debateConfig.maxRounds,
        });

        // Build request
        const debateRequest: DebateRequest = {
          question,
          max_rounds: debateConfig.maxRounds,
          models: debateConfig.models,
        };

        // Start debate session
        const response = await fetch(`${API_URL}/debate/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(debateRequest),
        });

        if (!response.ok) {
          throw new Error("Failed to start debate");
        }

        const data: DebateResponse = await response.json();

        setState((prev) => ({
          ...prev,
          sessionId: data.session_id,
          maxRounds: data.max_rounds,
          config: {
            maxRounds: data.max_rounds,
            models: data.models,
          },
        }));

        // Connect to SSE stream
        const eventSource = new EventSource(
          `${API_URL}/debate/${data.session_id}/stream`
        );
        eventSourceRef.current = eventSource;

        eventSource.addEventListener("message", (event) => {
          try {
            const data: StreamEvent = JSON.parse(event.data);
            handleStreamEvent(data);
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        });

        eventSource.addEventListener("round_start", (event) => {
          try {
            const data: StreamEvent = JSON.parse(event.data);
            setState((prev) => ({
              ...prev,
              roundNumber: data.round_number,
            }));
          } catch (e) {
            console.error("Failed to parse round_start:", e);
          }
        });

        eventSource.addEventListener("debate_end", () => {
          setState((prev) => ({ ...prev, isActive: false }));
          eventSource.close();
        });

        eventSource.addEventListener("error", () => {
          setState((prev) => ({
            ...prev,
            isActive: false,
            error: "Connection lost",
          }));
          eventSource.close();
        });

        eventSource.onerror = () => {
          setState((prev) => ({ ...prev, isActive: false }));
          eventSource.close();
        };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isActive: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [handleStreamEvent, state.config]
  );

  const stopDebate = useCallback(async () => {
    if (state.sessionId) {
      try {
        await fetch(`${API_URL}/debate/${state.sessionId}/stop`, {
          method: "POST",
        });
      } catch (e) {
        console.error("Failed to stop debate:", e);
      }
    }

    eventSourceRef.current?.close();
    setState((prev) => ({ ...prev, isActive: false }));
  }, [state.sessionId]);

  const resetDebate = useCallback(() => {
    eventSourceRef.current?.close();
    setState(initialState);
  }, []);

  return {
    state,
    startDebate,
    stopDebate,
    resetDebate,
    updateConfig,
  };
}
