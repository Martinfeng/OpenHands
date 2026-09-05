import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatStatusIndicator from "#/components/features/chat/chat-status-indicator";

vi.mock("#/icons/debug-stackframe-dot.svg?react", () => ({
  default: (props: any) => (
    <svg data-testid="debug-stackframe-dot" {...props} />
  ),
}));

describe("ChatStatusIndicator", () => {
  it("renders the status indicator with status text", () => {
    render(
      <ChatStatusIndicator
        status="Waiting for runtime"
        statusColor="#FFD600"
      />,
    );

    expect(screen.getByTestId("chat-status-indicator")).toBeInTheDocument();
    expect(screen.getByText("Waiting for runtime")).toBeInTheDocument();
  });

  it("reports status without a decorative dot", () => {
    render(<ChatStatusIndicator status="Error" statusColor="#FF684E" />);

    expect(screen.getByRole("status")).toHaveTextContent("Error");
    expect(
      screen.queryByTestId("debug-stackframe-dot"),
    ).not.toBeInTheDocument();
  });

  it("renders loading as readable static text", () => {
    render(<ChatStatusIndicator status="Loading" statusColor="#FFD600" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});
