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

export interface StreamEvent {
  event_type: string;
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
