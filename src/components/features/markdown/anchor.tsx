import React from "react";
import { ExtraProps } from "react-markdown";

export function anchor({
  href,
  children,
}: React.ClassAttributes<HTMLAnchorElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> &
  ExtraProps) {
  return (
    <a
      className="text-[var(--oh-link)] underline decoration-current/30 underline-offset-2 hover:decoration-current"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
