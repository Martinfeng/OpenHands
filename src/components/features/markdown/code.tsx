import React from "react";
import { ExtraProps } from "react-markdown";
import { useCodeTheme } from "#/themes/use-code-theme";
import { CopyableContentWrapper } from "#/components/shared/buttons/copyable-content-wrapper";
import { cn } from "#/utils/utils";
import { SyntaxHighlighter } from "./syntax-highlighter";

// See https://github.com/remarkjs/react-markdown?tab=readme-ov-file#use-custom-components-syntax-highlight

/**
 * Component to render code blocks in markdown.
 */
export function MarkdownCode({
  children,
  className,
}: React.ClassAttributes<HTMLElement> &
  React.HTMLAttributes<HTMLElement> &
  ExtraProps) {
  const theme = useCodeTheme();
  const match = /language-(\w+)/.exec(className || ""); // get the language
  const codeString = String(children).replace(/\n$/, "");

  if (!match) {
    const isMultiline = String(children).includes("\n");

    if (!isMultiline) {
      return (
        <code
          className={cn(
            className,
            "bg-surface-raised text-foreground border border-surface-raised rounded px-[0.4em] py-[0.2em]",
          )}
        >
          {children}
        </code>
      );
    }

    return (
      <CopyableContentWrapper text={codeString}>
        <pre className="bg-surface-raised text-foreground border border-surface-raised rounded p-[1em] overflow-auto">
          <code className={className}>{codeString}</code>
        </pre>
      </CopyableContentWrapper>
    );
  }

  return (
    <CopyableContentWrapper text={codeString}>
      <SyntaxHighlighter
        className="rounded-lg"
        style={theme}
        customStyle={{
          background: "var(--oh-surface)",
          border: "1px solid var(--oh-border-subtle)",
          fontSize: "0.8125rem",
          lineHeight: 1.65,
        }}
        language={match?.[1]}
        PreTag="div"
      >
        {codeString}
      </SyntaxHighlighter>
    </CopyableContentWrapper>
  );
}

export { MarkdownCode as code };
