import React, { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "#/utils/utils";

/**
 * A single neutral highlight crosses the current response title. Body text
 * never uses this component and reduced-motion users see a static label.
 */
const SHIMMER_BACKGROUND_SIZE = "200%";
/** Gradient period as a percentage of the (oversized) background image. */
const SHIMMER_PERIOD = 100;
/** Shifting background-position by one period == 2 * period (image is 2x wide). */
const SHIMMER_TRAVEL = 200;

export type TextShimmerProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">;

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2.6,
  spread = 12,
  style,
  ...rest
}: TextShimmerProps) {
  const reduceMotion = useReducedMotion();
  const reactId = useId();
  const animationName = `oh-text-shimmer-${reactId.replace(/:/g, "")}`;

  // Wider spread => wider bright band within each repeating period.
  const bandHalfWidth = useMemo(
    () => Math.min(SHIMMER_PERIOD / 2 - 1, 1 + spread / 2),
    [spread],
  );

  const shimmerStyle = useMemo(() => {
    const center = SHIMMER_PERIOD / 2;
    return {
      ...style,
      backgroundImage: `linear-gradient(105deg, var(--oh-muted) 0%, var(--oh-muted) ${center - bandHalfWidth}%, var(--oh-foreground) ${center}%, var(--oh-muted) ${center + bandHalfWidth}%, var(--oh-muted) 100%)`,
      backgroundSize: `${SHIMMER_BACKGROUND_SIZE} 100%`,
      backgroundRepeat: "no-repeat",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      animation: `${animationName} ${duration}s linear infinite`,
    } as React.CSSProperties;
  }, [animationName, bandHalfWidth, duration, style]);

  if (reduceMotion) {
    return (
      <Component
        className={cn("text-[var(--oh-muted)]", className)}
        style={style}
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
          __html: `@keyframes ${animationName}{from{background-position:${SHIMMER_TRAVEL}% center}to{background-position:-${SHIMMER_TRAVEL}% center}}`,
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
