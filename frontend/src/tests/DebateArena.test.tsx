import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebateArena } from "../components/DebateArena";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource for SSE testing
class MockEventSource {
  url: string;
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event: MessageEvent) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  dispatchEvent(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners[type]?.forEach((cb) => cb(event));
  }

  close() {}

  static instances: MockEventSource[] = [];
  static clear() {
    MockEventSource.instances = [];
  }
}

describe("DebateArena", () => {
  beforeEach(() => {
    MockEventSource.clear();
    // @ts-expect-error - mocking EventSource
    global.EventSource = MockEventSource;

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          models: {},
          available_providers: [],
        }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the header with correct title", () => {
    render(<DebateArena />);
    expect(screen.getByText("Agent Battle")).toBeInTheDocument();
  });

  it("renders question input and start button", () => {
    render(<DebateArena />);
    expect(screen.getByTestId("question-input")).toBeInTheDocument();
    expect(screen.getByTestId("start-button")).toBeInTheDocument();
  });

  it("renders both chat windows with correct titles", async () => {
    render(<DebateArena />);
    // Use getAllByText since the model names appear in multiple places
    await waitFor(() => {
      const gpt4Elements = screen.getAllByText("GPT-4.1");
      expect(gpt4Elements.length).toBeGreaterThan(0);
    });
    const geminiElements = screen.getAllByText(/Gemini 2\.5 Flash/);
    expect(geminiElements.length).toBeGreaterThan(0);
  });

  it("disables start button when question is empty", () => {
    render(<DebateArena />);
    const startButton = screen.getByTestId("start-button");
    expect(startButton).toBeDisabled();
  });

  it("enables start button when question is entered", async () => {
    const user = userEvent.setup();
    render(<DebateArena />);

    const input = screen.getByTestId("question-input");
    await user.type(input, "What is AI?");

    const startButton = screen.getByTestId("start-button");
    expect(startButton).not.toBeDisabled();
  });

  it("shows consolidated view when debate ends naturally", async () => {
    const user = userEvent.setup();

    // Mock fetch for starting debate
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/debate/start")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              session_id: "test-session",
              max_rounds: 1,
              models: [
                { provider: "openai", model_id: "gpt-4.1" },
                { provider: "gemini", model_id: "gemini-2.5-flash" },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: {}, available_providers: [] }),
      });
    });

    render(<DebateArena />);

    // Enter a question and start debate
    const input = screen.getByTestId("question-input");
    await user.type(input, "What is AI?");
    const startButton = screen.getByTestId("start-button");
    await user.click(startButton);

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
    });

    const eventSource = MockEventSource.instances[0];

    // Simulate debate messages
    eventSource.dispatchEvent("stream_start", {
      event_type: "stream_start",
      provider: "openai",
      message_id: "msg-1",
      round_number: 0,
      max_rounds: 1,
      model_id: "gpt-4.1",
    });

    eventSource.dispatchEvent("stream_chunk", {
      event_type: "stream_chunk",
      message_id: "msg-1",
      content: "AI is artificial intelligence.",
    });

    eventSource.dispatchEvent("stream_end", {
      event_type: "stream_end",
      message_id: "msg-1",
    });

    // Second model response
    eventSource.dispatchEvent("stream_start", {
      event_type: "stream_start",
      provider: "gemini",
      message_id: "msg-2",
      round_number: 0,
      max_rounds: 1,
      model_id: "gemini-2.5-flash",
    });

    eventSource.dispatchEvent("stream_chunk", {
      event_type: "stream_chunk",
      message_id: "msg-2",
      content: "AI encompasses machine learning.",
    });

    eventSource.dispatchEvent("stream_end", {
      event_type: "stream_end",
      message_id: "msg-2",
    });

    // Simulate debate ending naturally
    eventSource.dispatchEvent("debate_end", {
      event_type: "debate_end",
    });

    // Verify consolidated view appears with "Debate Results" header
    await waitFor(() => {
      expect(screen.getByText("Debate Results")).toBeInTheDocument();
    });

    // Verify "Original Question" section appears in consolidated view
    expect(screen.getByText("Original Question")).toBeInTheDocument();

    // Verify messages are visible
    expect(
      screen.getByText(/AI is artificial intelligence/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI encompasses machine learning/)
    ).toBeInTheDocument();
  });
});
