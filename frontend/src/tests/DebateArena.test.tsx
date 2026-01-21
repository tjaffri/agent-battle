import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebateArena } from "../components/DebateArena";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DebateArena", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          models: {},
          available_providers: [],
        }),
    });
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
});
