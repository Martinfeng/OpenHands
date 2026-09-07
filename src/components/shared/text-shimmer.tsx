import React, { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "#/utils/utils";

/**
 * A single highlight crosses the current response title. Body text never uses
 * this component and reduced-motion users see a static label.
 *
 * Timing matches Codex TUI (`sweep_seconds = 2`): one loop is always two
 * seconds, so a short label like「正在思考」reads slower and a long tool
 * title reads faster. The band is `5.2ch` (OpenCode/Codex half-width). The
 * gradient is 3.6× the text width so the glint fully leaves the glyphs
 * before wrapping. No hold at the end of a cycle.
 */
const SHIMMER_BACKGROUND_SIZE = "360%";
const SHIMMER_BAND_CH = 5.2;
const SHIMMER_DELAY_SECONDS = 0.1;
export const SHIMMER_CYCLE_SECONDS = 2;

export type TextShimmerProps = {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">;

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration,
  spread = 1,
  style,
  ...rest
}: TextShimmerProps) {
  const reduceMotion = useReducedMotion();
  const reactId = useId();
  const animationName = `oh-text-shimmer-${reactId.replace(/:/g, "")}`;
  const cycleSeconds = duration ?? SHIMMER_CYCLE_SECONDS;
  const band = `${SHIMMER_BAND_CH * spread}ch`;
  const sweepStart = "100%";
  const sweepEnd = "0%";

  const shimmerStyle = useMemo(() => {
    const base = "var(--oh-shimmer-base, var(--oh-muted))";
    const highlight = "var(--oh-shimmer-highlight, var(--oh-foreground))";
    const halfWidth = `${band} * var(--oh-shimmer-spread, 1)`;
    const core = "var(--oh-shimmer-core, 1.2ch)";
    return {
      ...style,
      backgroundColor: base,
      backgroundImage: `linear-gradient(105deg, ${base} 0%, ${base} calc(50% - ${halfWidth}), ${highlight} calc(50% - ${core}), ${highlight} calc(50% + ${core}), ${base} calc(50% + ${halfWidth}), ${base} 100%)`,
      backgroundSize: `${SHIMMER_BACKGROUND_SIZE} 100%`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: `${sweepStart} center`,
      fontWeight: "var(--oh-shimmer-weight, inherit)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      animation: `${animationName} ${cycleSeconds}s linear infinite`,
      animationDelay: `${SHIMMER_DELAY_SECONDS}s`,
    } as React.CSSProperties;
  }, [animationName, band, cycleSeconds, style, sweepStart]);

  if (reduceMotion) {
    return (
      <Component
        className={cn("text-[var(--oh-muted)]", className)}
        style={{
          ...style,
          color: "var(--oh-shimmer-base, var(--oh-muted))",
          fontWeight: "var(--oh-shimmer-weight, inherit)",
        }}
        {...rest}
      >
        {children}
      </Component>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ${animationName}{0%{background-position:${sweepStart} center}100%{background-position:${sweepEnd} center}}`,
        }}
      />
      <Component
        className={cn("oh-text-shimmer relative inline-block", className)}
        style={shimmerStyle}
        {...rest}
      >
        {children}
      </Component>
    </>
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);
