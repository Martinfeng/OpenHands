import { useTranslation } from "react-i18next";
import type { OHEvent } from "#/stores/use-event-store";
import type { UserRejectObservation } from "#/types/agent-server/core";
import {
  isACPToolCallEvent,
  isActionEvent,
  isAgentErrorEvent,
  isObservationEvent,
  isStreamingDeltaEvent,
} from "#/types/agent-server/type-guards";
import {
  getACPToolCallTitleKey,
  stripRedundantTitlePrefix,
} from "#/components/conversation-events/chat/event-content-helpers/get-acp-tool-call-content";
import {
  getActionEventTitleDescriptor,
  getActionSummaryTitle,
  type EventTitleDescriptor,
} from "#/components/conversation-events/chat/event-content-helpers/get-action-event-title";
import { TextShimmer } from "#/components/shared/text-shimmer";

const THINKING_ACTIVITY: EventTitleDescriptor = {
  kind: "translation",
  key: "RESPONSE$RESPONDING",
  values: {},
};

const LIVE_ACTION_KINDS = new Set([
  "ExecuteBashAction",
  "TerminalAction",
  "FileEditorAction",
  "StrReplaceEditorAction",
  "MCPToolAction",
  "InvokeSkillAction",
  "TaskAction",
  "ThinkAction",
  "TaskTrackerAction",
  "GrepAction",
  "GlobAction",
  "BrowserNavigateAction",
  "BrowserClickAction",
  "BrowserTypeAction",
  "BrowserGetStateAction",
  "BrowserGetContentAction",
  "BrowserScrollAction",
  "BrowserGoBackAction",
  "BrowserListTabsAction",
  "BrowserSwitchTabAction",
  "BrowserCloseTabAction",
]);

const getLiveActionTitle = (event: OHEvent): EventTitleDescriptor | null => {
  if (!isActionEvent(event)) return null;

  const summary = getActionSummaryTitle(event);
  if (summary) {
    return { kind: "text", text: summary };
  }

  return LIVE_ACTION_KINDS.has(event.action.kind)
    ? getActionEventTitleDescriptor(event)
    : null;
};

const isUserRejectObservation = (
  event: OHEvent,
): event is UserRejectObservation =>
  event.source === "environment" && "rejection_reason" in event;

export const deriveLiveActivity = (
  events: readonly OHEvent[],
): EventTitleDescriptor => {
  const resolvedActionIds = new Set<string>();
  const resolvedToolCallIds = new Set<string>();
  let latest: OHEvent | undefined;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (!events[index].isFromPlanningAgent) {
      latest = events[index];
      break;
    }
  }
  const fallback: EventTitleDescriptor =
    latest && isStreamingDeltaEvent(latest) && latest.content
      ? { kind: "translation", key: "RESPONSE$REPLYING", values: {} }
      : THINKING_ACTIVITY;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.isFromPlanningAgent) {
      continue;
    }
    // A new user turn must never inherit an unresolved tool from an old run.
    if (event.source === "user") break;

    if (isObservationEvent(event) || isUserRejectObservation(event)) {
      resolvedActionIds.add(event.action_id);
      resolvedToolCallIds.add(event.tool_call_id);
      continue;
    }

    if (isAgentErrorEvent(event)) {
      resolvedToolCallIds.add(event.tool_call_id);
      continue;
    }

    if (isACPToolCallEvent(event)) {
      const isInProgress =
        event.status === "pending" || event.status === "in_progress";
      if (!isInProgress) {
        resolvedToolCallIds.add(event.tool_call_id);
        continue;
      }
      if (resolvedToolCallIds.has(event.tool_call_id)) {
        continue;
      }

      const title = stripRedundantTitlePrefix(event);
      return title
        ? {
            kind: "translation",
            key: getACPToolCallTitleKey(event),
            values: { title },
          }
        : THINKING_ACTIVITY;
    }

    if (
      isActionEvent(event) &&
      !resolvedActionIds.has(event.id) &&
      !resolvedToolCallIds.has(event.tool_call_id)
    ) {
      return getLiveActionTitle(event) ?? THINKING_ACTIVITY;
    }
  }

  return fallback;
};

interface TypingIndicatorProps {
  readonly events: readonly OHEvent[];
}

export function TypingIndicator({ events }: TypingIndicatorProps) {
  const { t } = useTranslation("openhands");
  const activity = deriveLiveActivity(events);
  const title =
    activity.kind === "text"
      ? activity.text
      : t(activity.key, activity.values).replace(/<\/?(?:path|cmd)>/g, "");

  return (
    <div
      className="sticky top-0 z-10 min-w-0 bg-base py-2 text-sm font-medium"
      data-testid="live-activity-chip"
      role="status"
      aria-live="polite"
    >
      <TextShimmer
        as="span"
        duration={2.6}
        className="max-w-full truncate align-middle"
        title={title}
      >
        {title}
      </TextShimmer>
    </div>
  );
}
