import PlayIcon from "#/icons/play-solid.svg?react";
import { cn } from "#/utils/utils";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

export interface ChatResumeAgentButtonProps {
  onAgentResumed: () => void;
  disabled?: boolean;
}

export function ChatResumeAgentButton({
  onAgentResumed,
  disabled = false,
}: ChatResumeAgentButtonProps) {
  const { t } = useTranslation("openhands");
  return (
    <button
      type="button"
      onClick={onAgentResumed}
      data-testid="play-button"
      aria-label={t(I18nKey.CHAT_INTERFACE$INPUT_CONTINUE_MESSAGE)}
      disabled={disabled}
      className={cn("cursor-pointer", disabled && "cursor-not-allowed")}
    >
      <PlayIcon className="block max-w-none w-4 h-4 text-current" />
    </button>
  );
}
