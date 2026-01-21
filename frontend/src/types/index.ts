export type LLMProvider = "openai" | "gemini" | "anthropic";

export interface Message {
  id: string;
  provider: LLMProvider;
  content: string;
  timestamp: Date;
  isCritique: boolean;
  roundNumber: number;
  isStreaming?: boolean;
  modelId?: string;
}

export interface SelectedModel {
  provider: LLMProvider;
  model_id: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: LLMProvider;
}

export interface AvailableModelsResponse {
  models: Record<string, ModelInfo[]>;
  available_providers: string[];
}

export interface DebateConfig {
  maxRounds: number;
  models: SelectedModel[];
}

export interface DebateState {
  sessionId: string | null;
  question: string;
  messages: Message[];
  isActive: boolean;
  roundNumber: number;
  maxRounds: number;
  error: string | null;
  config: DebateConfig;
}

/**
 * Event types:
 * - round_start: Start of a new debate round
 * - stream_start: Start of a model's streaming response
 * - stream_chunk: Partial content from a streaming response
 * - stream_end: End of a model's streaming response
 * - message: Complete message (non-streaming, legacy)
 * - round_end: End of a debate round
 * - debate_end: Debate has completed
 * - error: An error occurred
 */
export interface StreamEvent {
  event_type:
    | "round_start"
    | "stream_start"
    | "stream_chunk"
    | "stream_end"
    | "message"
    | "round_end"
    | "debate_end"
    | "error";
  provider?: LLMProvider;
  content: string;
  message_id?: string;
  round_number: number;
  max_rounds?: number;
  model_id?: string;
}

export interface DebateRequest {
  question: string;
  session_id?: string;
  max_rounds?: number;
  models?: SelectedModel[];
}

export interface DebateResponse {
  session_id: string;
  question: string;
  max_rounds: number;
  models: SelectedModel[];
}
