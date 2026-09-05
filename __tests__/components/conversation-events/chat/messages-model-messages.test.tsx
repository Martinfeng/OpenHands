import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "test-utils";
import { Messages } from "#/components/conversation-events/chat/messages";
import { useModelStore } from "#/stores/model-store";
import {
  ActionEvent,
  ObservationEvent,
  SecurityRisk,
} from "#/types/agent-server/core";
import { ExecuteBashAction } from "#/types/agent-server/core/base/action";
import { StreamingDeltaEvent } from "#/types/agent-server/core/events/streaming-delta-event";

const CONVERSATION_ID = "test-conversation-id";

const makeBashAction = (id: string): ActionEvent<ExecuteBashAction> => ({
  id,
  timestamp: new Date().toISOString(),
  source: "agent",
  thought: [],
  thinking_blocks: [],
  action: {
    kind: "ExecuteBashAction",
    command: `echo ${id}`,
    is_input: false,
    timeout: null,
    reset: false,
  },
  tool_name: "execute_bash",
  tool_call_id: `call_${id}`,
  tool_call: {
    id: `call_${id}`,
    type: "function",
    function: {
      name: "execute_bash",
      arguments: JSON.stringify({ command: `echo ${id}` }),
    },
  },
  llm_response_id: `response_${id}`,
  security_risk: SecurityRisk.UNKNOWN,
  summary: id,
});

const makeStreamingDelta = (content: string): StreamingDeltaEvent => ({
  id: "delta-1",
  timestamp: "2026-06-12T12:00:00Z",
  source: "agent",
  kind: "StreamingDeltaEvent",
  content,
  reasoning_content: null,
});

const completeAction = (action: ActionEvent): ObservationEvent => ({
  id: `observation-${action.id}`,
  timestamp: action.timestamp,
  source: "environment",
  action_id: action.id,
  tool_call_id: action.tool_call_id,
  tool_name: action.tool_name,
  observation: {
    kind: "TerminalObservation",
    content: [],
    command: `echo ${action.id}`,
    exit_code: 0,
    is_error: false,
    timeout: false,
    metadata: {
      exit_code: 0,
      pid: 1,
      username: "openhands",
      hostname: "runtime",
      prefix: "",
      suffix: "",
      working_dir: "/projects",
      py_interpreter_path: null,
    },
  },
});

describe("Messages model entries", () => {
  beforeEach(() => {
    useModelStore.setState({ entriesByConversation: {} });
  });

  it("renders model entries anchored to non-last events inside grouped runs", () => {
    const first = makeBashAction("action-1");
    const second = makeBashAction("action-2");
    useModelStore.getState().show(CONVERSATION_ID, first.id, []);

    renderWithProviders(
      <Messages messages={[first, second]} allEvents={[first, second]} />,
    );

    expect(screen.getByTestId("model-messages")).toBeInTheDocument();
  });

  it("rerenders when a streaming delta is compacted under the same event id", () => {
    const firstDelta = makeStreamingDelta("First");
    const mergedDelta = makeStreamingDelta("First second third");

    const { rerender } = renderWithProviders(
      <Messages messages={[firstDelta]} allEvents={[firstDelta]} />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();

    rerender(<Messages messages={[mergedDelta]} allEvents={[mergedDelta]} />);

    expect(screen.getByText("First second third")).toBeInTheDocument();
  });

  it("moves the only shimmer from a tool title to the next group title, including when expanded", () => {
    const first = makeBashAction("first-tool");
    const second = makeBashAction("second-tool");
    const done = completeAction(first);
    const { container, rerender } = renderWithProviders(
      <Messages messages={[first]} allEvents={[first]} isResponding />,
    );
    expect(screen.getByTestId("live-activity-chip")).toHaveTextContent(
      "first-tool",
    );
    rerender(
      <Messages
        messages={[done, second]}
        allEvents={[first, done, second]}
        isResponding
      />,
    );
    expect(container.querySelectorAll(".oh-text-shimmer")).toHaveLength(1);
    expect(screen.getByTestId("live-activity-chip")).toHaveTextContent(
      "second-tool",
    );
    fireEvent.click(screen.getByTestId("event-group-toggle"));
    expect(container.querySelectorAll(".oh-text-shimmer")).toHaveLength(1);
    expect(
      screen
        .getByTestId("live-activity-chip")
        .closest("[data-testid=event-group-content]"),
    ).toBeNull();
    rerender(
      <Messages
        messages={[done, second]}
        allEvents={[first, done, second]}
        isResponding={false}
      />,
    );
    expect(screen.queryByTestId("live-activity-chip")).not.toBeInTheDocument();
  });

  it("uses an inline temporary thinking item only after a tool has completed", () => {
    const action = makeBashAction("finished-tool");
    const done = completeAction(action);
    const { container } = renderWithProviders(
      <Messages messages={[done]} allEvents={[action, done]} isResponding />,
    );
    const indicator = screen.getByTestId("live-activity-chip");
    expect(indicator).not.toHaveTextContent("finished-tool");
    expect(indicator).not.toHaveClass("sticky", "fixed");
    expect(container.querySelectorAll(".oh-text-shimmer")).toHaveLength(1);
  });

  it("highlights streaming reasoning's title and stops when body text begins", () => {
    const reasoning = {
      ...makeStreamingDelta(""),
      reasoning_content: "Considering the next step",
    };
    const { container, rerender } = renderWithProviders(
      <Messages messages={[reasoning]} allEvents={[reasoning]} isResponding />,
    );
    expect(screen.getByTestId("collapsible-thinking-toggle")).toContainElement(
      screen.getByTestId("live-activity-chip"),
    );
    fireEvent.click(screen.getByTestId("collapsible-thinking-toggle"));
    expect(container.querySelectorAll(".oh-text-shimmer")).toHaveLength(1);
    const reply = { ...reasoning, content: "Here is the result" };
    rerender(<Messages messages={[reply]} allEvents={[reply]} isResponding />);
    expect(screen.getByText("Here is the result")).toBeInTheDocument();
    expect(container.querySelectorAll(".oh-text-shimmer")).toHaveLength(0);
    expect(screen.queryByTestId("live-activity-chip")).not.toBeInTheDocument();
  });
});
