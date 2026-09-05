import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

type ConversationLoadingProps = {
  className?: string;
};

export function ConversationLoading({ className }: ConversationLoadingProps) {
  const { t } = useTranslation("openhands");

  return (
    <div
      className={cn(
        "bg-[var(--oh-surface)] flex h-full w-full flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <p
        role="status"
        aria-live="polite"
        className="block w-full text-center text-base font-normal leading-5 text-muted"
      >
        {t(I18nKey.HOME$LOADING)}
      </p>
    </div>
  );
}
