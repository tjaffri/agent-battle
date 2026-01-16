export type LLMProvider = "openai" | "gemini";

export interface Message {
  id: string;
  provider: LLMProvider;
  content: string;
  timestamp: Date;
  isCritique: boolean;
  roundNumber: number;
  isStreaming?: boolean;
}

export interface DebateState {
  sessionId: string | null;
  question: string;
  messages: Message[];
  isActive: boolean;
  roundNumber: number;
  error: string | null;
}

export interface StreamEvent {
  event_type: string;
  provider?: LLMProvider;
  content: string;
  message_id?: string;
  round_number: number;
}
