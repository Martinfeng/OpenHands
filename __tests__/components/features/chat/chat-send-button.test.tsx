import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatSendButton } from "#/components/features/chat/chat-send-button";

describe("ChatSendButton", () => {
  it("uses semantic colors instead of hardcoded white", () => {
    render(
      <ChatSendButton
        buttonClassName=""
        handleSubmit={vi.fn()}
        disabled={false}
      />,
    );

    const button = screen.getByTestId("submit-button");
    expect(button.className).toContain("border-foreground");
    expect(button.className).not.toContain("border-white");
    expect(button.querySelector("svg")?.getAttribute("color")).not.toBe(
      "white",
    );
  });
});
