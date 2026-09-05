import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { StyledTooltip } from "./buttons/styled-tooltip";

interface ActionTooltipProps {
  type: "confirm" | "reject";
  onClick: () => void;
  disabled?: boolean;
}

export function ActionTooltip({ type, onClick, disabled }: ActionTooltipProps) {
  const { t } = useTranslation("openhands");

  const isConfirm = type === "confirm";

  const ariaLabel = isConfirm
    ? t(I18nKey.ACTION$CONFIRM)
    : t(I18nKey.ACTION$REJECT);

  const content = isConfirm
    ? t(I18nKey.CHAT_INTERFACE$USER_CONFIRMED)
    : t(I18nKey.CHAT_INTERFACE$USER_REJECTED);

  const buttonLabel = isConfirm
    ? `${t(I18nKey.CHAT_INTERFACE$INPUT_CONTINUE_MESSAGE)} ⌘↩`
    : `${t(I18nKey.ACTION$REJECT)} ⇧⌘⌫`;

  return (
    <StyledTooltip closeDelay={100} content={content}>
      <button
        data-testid={`action-${type}-button`}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "rounded-lg px-3 h-8 text-sm font-medium leading-5 cursor-pointer hover:opacity-90 disabled:cursor-wait disabled:opacity-50",
          type === "confirm"
            ? "bg-primary text-[var(--oh-accent-foreground)]"
            : "border border-border bg-base text-foreground",
        )}
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </StyledTooltip>
  );
}
