import React, { useId, useLayoutEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "#/utils/utils";

/**
 * A single highlight crosses the current response title. Body text never uses
 * this component and reduced-motion users see a static label.
 *
 * The band is sized in `em` so two- or three-character titles still keep a
 * darker base beside the highlight. Cycle time follows the painted width so a
 * short label is not a 3s wash of one color.
 */
const SHIMMER_BACKGROUND_SIZE = "200%";
const SHIMMER_BAND_EM = 0.58;
const SHIMMER_SWEEP_PORTION = 0.78;
const SHIMMER_MIN_SWEEP_SECONDS = 0.95;
const SHIMMER_MAX_SWEEP_SECONDS = 1.7;
const SHIMMER_PIXELS_PER_SECOND = 72;
const SHIMMER_DELAY_SECONDS = 0.1;

export function shimmerCycleSeconds(widthPx: number): number {
  const travel = Number.isFinite(widthPx) ? Math.max(widthPx, 0) : 0;
  const sweep = Math.min(
    SHIMMER_MAX_SWEEP_SECONDS,
    Math.max(SHIMMER_MIN_SWEEP_SECONDS, travel / SHIMMER_PIXELS_PER_SECOND),
  );
  return sweep / SHIMMER_SWEEP_PORTION;
}

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
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [measuredDuration, setMeasuredDuration] = useState(() =>
    shimmerCycleSeconds(48),
  );

  useLayoutEffect(() => {
    if (duration != null || !node) {
      return undefined;
    }
    const update = () => {
      setMeasuredDuration(
        shimmerCycleSeconds(node.getBoundingClientRect().width),
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children, duration, node]);

  const cycleSeconds = duration ?? measuredDuration;
  const band = `${SHIMMER_BAND_EM * spread}em`;
  const sweepStart = `calc(100% + ${band})`;
  const sweepEnd = `calc(0% - ${band})`;

  const shimmerStyle = useMemo(() => {
    const base = "var(--oh-shimmer-base, var(--oh-muted))";
    const highlight = "var(--oh-shimmer-highlight, var(--oh-foreground))";
    const halfWidth = `${band} * var(--oh-shimmer-spread, 1)`;
    const core = "var(--oh-shimmer-core, 0.16em)";
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

  const sweepPercent = Math.round(SHIMMER_SWEEP_PORTION * 100);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ${animationName}{0%{background-position:${sweepStart} center}${sweepPercent}%,100%{background-position:${sweepEnd} center}}`,
        }}
      />
      <Component
        ref={setNode}
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
