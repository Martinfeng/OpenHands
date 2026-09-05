import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { AgentState } from "#/types/agent-state";
import { ActionTooltip } from "../action-tooltip";
import { RiskAlert } from "#/components/shared/risk-alert";
import WarningIcon from "#/icons/u-warning.svg?react";
import { useEventMessageStore } from "#/stores/event-message-store";
import { useEventStore } from "#/stores/use-event-store";
import { isActionEvent } from "#/types/agent-server/type-guards";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useAgentState } from "#/hooks/use-agent-state";
import { useRespondToConfirmation } from "#/hooks/mutation/use-respond-to-confirmation";
import { SecurityRisk } from "#/types/agent-server/core/base/common";

export function ConversationConfirmationButtons() {
  const submittedEventIds = useEventMessageStore(
    (state) => state.submittedEventIds,
  );
  const addSubmittedEventId = useEventMessageStore(
    (state) => state.addSubmittedEventId,
  );
  const removeSubmittedEventId = useEventMessageStore(
    (state) => state.removeSubmittedEventId,
  );
  const [failed, setFailed] = useState(false);

  const { t } = useTranslation("openhands");
  const { data: conversation } = useActiveConversation();
  const { curAgentState } = useAgentState();
  const { mutate: respondToConfirmation, isPending } =
    useRespondToConfirmation();
  const events = useEventStore((state) => state.events);

  const awaitingAction = events
    .slice()
    .reverse()
    .find((ev) => {
      if (ev.source !== "agent") return false;
      return curAgentState === AgentState.AWAITING_USER_CONFIRMATION;
    });

  const handleConfirmation = useCallback(
    (accept: boolean) => {
      if (!awaitingAction || !conversation) {
        return;
      }
      if (
        isPending ||
        (awaitingAction.id &&
          useEventMessageStore
            .getState()
            .submittedEventIds.includes(awaitingAction.id))
      )
        return;
      setFailed(false);

      // Mark event as submitted to prevent duplicate submissions
      if (awaitingAction.id) {
        addSubmittedEventId(awaitingAction.id);
      }

      // Call the agent-server API endpoint
      respondToConfirmation(
        {
          conversationId: conversation.id,
          conversationUrl: conversation.conversation_url || "",
          sessionApiKey: conversation.session_api_key,
          accept,
        },
        {
          onError: () => {
            if (awaitingAction.id) removeSubmittedEventId(awaitingAction.id);
            setFailed(true);
          },
        },
      );
    },
    [
      awaitingAction,
      conversation,
      addSubmittedEventId,
      removeSubmittedEventId,
      respondToConfirmation,
      isPending,
    ],
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!awaitingAction) {
      return undefined;
    }

    const handleCancelShortcut = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        event.key === "Backspace"
      ) {
        event.preventDefault();
        handleConfirmation(false);
      }
    };

    const handleContinueShortcut = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        handleConfirmation(true);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Cancel: Shift+Cmd+Backspace (⇧⌘⌫)
      handleCancelShortcut(event);
      // Continue: Cmd+Enter (⌘↩)
      handleContinueShortcut(event);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [awaitingAction, handleConfirmation]);

  // Only show if agent is waiting for confirmation and we haven't already submitted
  if (
    curAgentState !== AgentState.AWAITING_USER_CONFIRMATION ||
    !awaitingAction ||
    (awaitingAction.id !== undefined &&
      submittedEventIds.includes(awaitingAction.id) &&
      !isPending)
  ) {
    return null;
  }

  // Get security risk from the action (only ActionEvent has security_risk)
  const risk = isActionEvent(awaitingAction)
    ? awaitingAction.security_risk
    : SecurityRisk.UNKNOWN;

  const isHighRisk = risk === SecurityRisk.HIGH;

  return (
    <div
      className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
      aria-busy={isPending}
    >
      {isHighRisk && (
        <RiskAlert
          content={t(I18nKey.CHAT_INTERFACE$HIGH_RISK_WARNING)}
          icon={<WarningIcon width={16} height={16} color="#fff" />}
          severity="high"
          title={t(I18nKey.COMMON$HIGH_RISK)}
        />
      )}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm font-normal text-foreground">
          {t(I18nKey.CHAT_INTERFACE$USER_ASK_CONFIRMATION)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ActionTooltip
            type="reject"
            disabled={isPending}
            onClick={() => handleConfirmation(false)}
          />
          <ActionTooltip
            type="confirm"
            disabled={isPending}
            onClick={() => handleConfirmation(true)}
          />
        </div>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-[var(--oh-status-error)]">
          {t(I18nKey.APPROVAL$FAILED)}
        </p>
      )}
    </div>
  );
}
