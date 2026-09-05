import type { Element, ElementContent } from "hast";

export const TABLE_CHART_LIMITS = {
  rows: 5000,
  columns: 50,
  series: 6,
} as const;
export type TableChartKind = "table" | "line" | "bar" | "scatter";
export interface TableData {
  headers: string[];
  rows: string[][];
  numbers: (number | null)[][];
  numericColumns: number[];
}
export type TableParseResult =
  | { data: TableData; reason?: never }
  | { data?: never; reason: "limit" | "unreliable" };

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const MISSING = /^(?:|—|–|n\/?a|null)$/i;

/** Strict decimal notation only: never guess units, percentages or locale. */
export function parseTableNumber(text: string): number | null | undefined {
  const value = text.trim();
  if (MISSING.test(value)) return null;
  if (!NUMBER.test(value)) return undefined;
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    (Number.isInteger(number) && !Number.isSafeInteger(number))
  )
    return undefined;
  if (number === 0 && /[1-9]/.test(value.split(/[eE]/)[0])) return undefined;
  return number;
}

function plainText(node: ElementContent): string | undefined {
  if (node.type === "text") return node.value;
  if (
    node.type !== "element" ||
    !["th", "td", "strong", "em", "del", "code", "a"].includes(node.tagName)
  )
    return undefined;
  if (node.properties.rowSpan || node.properties.colSpan) return undefined;
  const parts = node.children.map(plainText);
  return parts.some((part) => part === undefined) ? undefined : parts.join("");
}

export function parseTableData(node?: Element): TableParseResult {
  if (!node) return { reason: "unreliable" };
  const rows: Element[] = [];
  for (const section of node.children) {
    if (section.type === "text" && !section.value.trim()) continue;
    if (section.type !== "element") return { reason: "unreliable" };
    if (section.tagName === "tr") rows.push(section);
    else if (["thead", "tbody"].includes(section.tagName)) {
      for (const row of section.children) {
        if (row.type === "text" && !row.value.trim()) continue;
        if (row.type !== "element" || row.tagName !== "tr")
          return { reason: "unreliable" };
        rows.push(row);
        if (rows.length > TABLE_CHART_LIMITS.rows + 1)
          return { reason: "limit" };
      }
    } else return { reason: "unreliable" };
    if (rows.length > TABLE_CHART_LIMITS.rows + 1) return { reason: "limit" };
  }
  const matrix: string[][] = [];
  for (const [index, row] of rows.entries()) {
    const cells = row.children.filter(
      (cell) => cell.type !== "text" || cell.value.trim(),
    );
    if (cells.length > TABLE_CHART_LIMITS.columns) return { reason: "limit" };
    if (
      cells.some(
        (cell) =>
          cell.type !== "element" ||
          cell.tagName !== (index === 0 ? "th" : "td"),
      )
    )
      return { reason: "unreliable" };
    const values = cells.map(plainText);
    if (values.some((value) => value === undefined))
      return { reason: "unreliable" };
    matrix.push(values as string[]);
  }
  const [headers, ...dataRows] = matrix;
  if (
    !headers?.length ||
    !dataRows.length ||
    dataRows.some((row) => row.length !== headers.length)
  )
    return { reason: "unreliable" };
  const parsed = dataRows.map((row) => row.map(parseTableNumber));
  const numericColumns = headers.flatMap((_, index) =>
    parsed.every((row) => row[index] !== undefined) &&
    parsed.some((row) => row[index] != null)
      ? [index]
      : [],
  );
  if (!numericColumns.length) return { reason: "unreliable" };
  return {
    data: {
      headers,
      rows: dataRows,
      numbers: parsed.map((row) => row.map((cell) => cell ?? null)),
      numericColumns,
    },
  };
}
