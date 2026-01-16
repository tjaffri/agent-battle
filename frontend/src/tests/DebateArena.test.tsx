import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebateArena } from "@/components/DebateArena";

// Mock fetch
global.fetch = vi.fn();

describe("DebateArena", () => {
  it("renders the header with correct title", () => {
    render(<DebateArena />);
    expect(screen.getByText("Agent Battle")).toBeInTheDocument();
  });

  it("renders question input and start button", () => {
    render(<DebateArena />);
    expect(screen.getByTestId("question-input")).toBeInTheDocument();
    expect(screen.getByTestId("start-button")).toBeInTheDocument();
  });

  it("renders both chat windows with correct titles", () => {
    render(<DebateArena />);
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("Gemini 2.0")).toBeInTheDocument();
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
