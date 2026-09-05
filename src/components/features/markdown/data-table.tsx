import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { table as MarkdownTable } from "./table";
import {
  parseTableData,
  TABLE_CHART_LIMITS,
  type TableChartKind,
} from "./table-data";
import { TableChart } from "./table-chart";

const CHART_LABELS = {
  table: I18nKey.TABLE_CHART$TABLE,
  line: I18nKey.TABLE_CHART$LINE,
  bar: I18nKey.TABLE_CHART$BAR,
  scatter: I18nKey.TABLE_CHART$SCATTER,
};

export function DataTable(props: ComponentProps<typeof MarkdownTable>) {
  const { t } = useTranslation("openhands");
  const parsed = useMemo(() => parseTableData(props.node), [props.node]);
  const [kind, setKind] = useState<TableChartKind>("table");
  const [x, setX] = useState(0);
  const [selected, setSelected] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const onError = useCallback(() => {
    setFailed(true);
    setKind("table");
  }, []);
  const data = parsed.data;
  const series = useMemo(
    () =>
      data
        ? (
            selected ??
            data.numericColumns.filter((col) => col !== x).slice(0, 2)
          )
            .filter((col) => col !== x && data.numericColumns.includes(col))
            .slice(0, TABLE_CHART_LIMITS.series)
        : [],
    [data, selected, x],
  );
  const canScatter = !!data?.numericColumns.includes(x) && series.length > 0;
  const showChart =
    data &&
    !failed &&
    kind !== "table" &&
    series.length > 0 &&
    (kind !== "scatter" || canScatter);
  const table = <MarkdownTable {...props} />;
  if (!data)
    return (
      <div>
        {table}
        <p className="mb-3 text-xs text-muted">
          {t(
            parsed.reason === "limit"
              ? I18nKey.TABLE_CHART$LIMIT
              : I18nKey.TABLE_CHART$UNRELIABLE,
          )}
        </p>
      </div>
    );

  const content = (
    <>
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border-subtle p-2"
        role="group"
        aria-label={t(I18nKey.TABLE_CHART$VIEW)}
      >
        {(Object.keys(CHART_LABELS) as TableChartKind[]).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={kind === view}
            disabled={
              view !== "table" &&
              (failed || !series.length || (view === "scatter" && !canScatter))
            }
            onClick={() => setKind(view)}
            className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-interactive-hover-low aria-pressed:bg-interactive-active aria-pressed:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t(CHART_LABELS[view])}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded-md px-2 py-1 text-xs text-muted hover:bg-interactive-hover-low"
          onClick={() => {
            if (expanded) dialog.current?.close();
            else {
              setExpanded(true);
              dialog.current?.showModal();
            }
          }}
        >
          {t(expanded ? I18nKey.BUTTON$COLLAPSE : I18nKey.BUTTON$EXPAND)}
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-2 px-3 py-2 text-xs text-muted">
        <label className="flex items-center gap-2">
          {t(I18nKey.TABLE_CHART$X)}
          <select
            value={x}
            onChange={(event) => {
              setX(Number(event.target.value));
              setKind("table");
            }}
            className="max-w-48 rounded-md border border-border-subtle bg-surface px-2 py-1 text-foreground"
          >
            {data.headers.map((header, index) => (
              <option key={index} value={index}>
                {index + 1}. {header}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
          <legend className="mb-1">{t(I18nKey.TABLE_CHART$Y)}</legend>
          {data.numericColumns
            .filter((col) => col !== x)
            .map((col) => (
              <label
                key={col}
                className="inline-flex max-w-full items-center gap-1.5"
              >
                <input
                  type="checkbox"
                  checked={series.includes(col)}
                  disabled={
                    !series.includes(col) &&
                    series.length >= TABLE_CHART_LIMITS.series
                  }
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...series, col]
                        : series.filter((index) => index !== col),
                    )
                  }
                  className="accent-primary"
                />
                <span className="truncate">
                  {col + 1}. {data.headers[col]}
                </span>
              </label>
            ))}
        </fieldset>
      </div>
      {failed && (
        <p role="status" className="px-3 text-xs text-muted">
          {t(I18nKey.TABLE_CHART$FAILED)}
        </p>
      )}
      {showChart ? (
        <TableChart
          data={data}
          kind={kind}
          x={x}
          series={series}
          expanded={expanded}
          onError={onError}
        />
      ) : (
        table
      )}
    </>
  );
  return (
    <div
      className="my-4 min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-base"
      data-testid="data-table"
    >
      {!expanded && content}
      <dialog
        ref={dialog}
        aria-label={t(I18nKey.TABLE_CHART$VIEW)}
        onClose={() => setExpanded(false)}
        className="m-auto max-h-[90vh] w-[min(1100px,94vw)] max-w-none overflow-auto rounded-2xl border border-border bg-base p-0 text-foreground shadow-2xl backdrop:bg-black/35"
      >
        {expanded && content}
      </dialog>
    </div>
  );
}
