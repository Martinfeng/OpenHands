import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EChartsCoreOption } from "echarts/core";
import { I18nKey } from "#/i18n/declaration";
import { useUITheme } from "#/themes/ui-theme-context";
import type { TableData, TableChartKind } from "./table-data";

interface TableChartProps {
  data: TableData;
  kind: Exclude<TableChartKind, "table">;
  x: number;
  series: number[];
  expanded: boolean;
  onError: () => void;
}

export function tableChartOption(
  data: TableData,
  kind: Exclude<TableChartKind, "table">,
  x: number,
  series: number[],
  foreground: string,
  border: string,
): EChartsCoreOption {
  return {
    animation: false,
    color: ["#4c82ee", "#34a889", "#b489dc", "#df9951", "#dc798a", "#6e9ca9"],
    textStyle: {
      color: foreground,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    },
    aria: { enabled: true, decal: { show: true } },
    grid: { left: 56, right: 24, top: 48, bottom: 72, containLabel: true },
    legend: { type: "scroll", textStyle: { color: foreground } },
    // Canvas text keeps untrusted headers/cells out of tooltip HTML.
    tooltip: {
      trigger: kind === "scatter" ? "item" : "axis",
      renderMode: "richText",
    },
    xAxis: {
      type: kind === "scatter" ? "value" : "category",
      name: data.headers[x],
      ...(kind === "scatter" ? {} : { data: data.rows.map((row) => row[x]) }),
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground },
    },
    dataZoom: [
      { type: "inside", filterMode: "none" },
      { type: "slider", filterMode: "none", height: 18, bottom: 16 },
    ],
    series: series.map((column) => ({
      name: `${data.headers[column]} (${column + 1})`,
      type: kind,
      connectNulls: false,
      smooth: false,
      showSymbol: data.rows.length < 80,
      symbolSize: 6,
      emphasis: { focus: "series" },
      data: data.numbers.map((row) =>
        kind === "scatter"
          ? row[x] === null || row[column] === null
            ? null
            : [row[x], row[column]]
          : row[column],
      ),
    })),
  };
}

export function TableChart({
  data,
  kind,
  x,
  series,
  expanded,
  onError,
}: TableChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const appearance = useUITheme();
  const { t } = useTranslation("openhands");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    let disposed = false;
    let chart: ReturnType<typeof import("./echarts-runtime").init> | undefined;
    let observer: ResizeObserver | undefined;
    setLoading(true);
    import("./echarts-runtime")
      .then(({ init }) => {
        if (disposed) return;
        chart = init(element, undefined, { renderer: "canvas" });
        const style = getComputedStyle(element);
        chart.setOption(
          tableChartOption(
            data,
            kind,
            x,
            series,
            style.color,
            style.borderTopColor,
          ),
        );
        observer = new ResizeObserver(() => chart?.resize());
        observer.observe(element);
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) onError();
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [data, kind, x, series, expanded, appearance, onError]);
  return (
    <div className="relative">
      {loading && (
        <p
          role="status"
          className="absolute inset-x-0 top-4 text-center text-sm text-muted"
        >
          {t(I18nKey.HOME$LOADING)}
        </p>
      )}
      <div
        ref={host}
        className="w-full text-foreground border-border-subtle"
        style={{ height: expanded ? "60vh" : 340 }}
        role="img"
        aria-label={t(I18nKey.TABLE_CHART$DESCRIPTION)}
      />
    </div>
  );
}
