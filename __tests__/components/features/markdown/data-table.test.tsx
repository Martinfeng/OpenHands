import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Element } from "hast";
import {
  parseTableData,
  parseTableNumber,
} from "#/components/features/markdown/table-data";
import { tableChartOption } from "#/components/features/markdown/table-chart";
import { MarkdownRenderer } from "#/components/features/markdown/markdown-renderer";

vi.mock("#/components/features/markdown/echarts-runtime", () => ({
  init: () => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }),
}));

function tableNode(headers: string[], rows: string[][]): Element {
  return {
    type: "element",
    tagName: "table",
    properties: {},
    children: [headers, ...rows].map((row, index) => ({
      type: "element",
      tagName: "tr",
      properties: {},
      children: row.map((value) => ({
        type: "element",
        tagName: index ? "td" : "th",
        properties: {},
        children: [{ type: "text", value }],
      })),
    })),
  };
}

describe("table-derived charts", () => {
  it.each([
    "NaN",
    "Infinity",
    "1,200",
    "25%",
    "$4",
    "2ms",
    "0x10",
    "1e999",
    "9007199254740993",
    "1e-999",
  ])("does not guess or silently round %s", (input) => {
    expect(parseTableNumber(input)).toBeUndefined();
  });
  it("preserves row order, signed decimals, scientific notation and missing values", () => {
    const result = parseTableData(
      tableNode(
        ["epoch", "loss", "accuracy"],
        [
          ["2", "-1.25e-2", ""],
          ["1", "N/A", "0.85"],
        ],
      ),
    );
    expect(result.data?.rows).toEqual([
      ["2", "-1.25e-2", ""],
      ["1", "N/A", "0.85"],
    ]);
    expect(result.data?.numbers).toEqual([
      [2, -0.0125, null],
      [1, null, 0.85],
    ]);
    expect(result.data?.numericColumns).toEqual([0, 1, 2]);
  });
  it("excludes mixed numeric/text columns instead of dropping bad cells", () => {
    expect(
      parseTableData(
        tableNode(
          ["x", "y"],
          [
            ["a", "1"],
            ["b", "oops"],
          ],
        ),
      ).reason,
    ).toBe("unreliable");
  });
  it("refuses oversized tables and ambiguous merged cells", () => {
    expect(
      parseTableData(
        tableNode(
          ["x"],
          Array.from({ length: 5001 }, () => ["1"]),
        ),
      ).reason,
    ).toBe("limit");
    expect(
      parseTableData(tableNode(Array(51).fill("x"), [Array(51).fill("1")]))
        .reason,
    ).toBe("limit");
    const node = tableNode(["x"], [["1"]]);
    ((node.children[1] as Element).children[0] as Element).properties.colSpan =
      2;
    expect(parseTableData(node).reason).toBe("unreliable");
  });
  it("keeps missing points as gaps in every chart type and never uses HTML tooltips", () => {
    const { data } = parseTableData(
      tableNode(
        ["x", "y"],
        [
          ["1", "2"],
          ["2", ""],
          ["3", "4"],
        ],
      ),
    );
    for (const kind of ["line", "bar", "scatter"] as const) {
      const option = tableChartOption(data!, kind, 0, [1], "#222", "#ddd");
      expect(option.tooltip).toMatchObject({ renderMode: "richText" });
      expect(option.series).toMatchObject([
        {
          connectNulls: false,
          data: kind === "scatter" ? [[1, 2], null, [3, 4]] : [2, null, 4],
        },
      ]);
    }
    expect(data?.rows[1][1]).toBe("");
  });
  it("defaults to the original table and enables charts only for agent output", () => {
    const markdown =
      "| epoch | loss | accuracy |\n| - | - | - |\n| 1 | 0.5 | 0.8 |\n| 2 | | 0.9 |";
    const { rerender } = render(<MarkdownRenderer content={markdown} />);
    expect(screen.queryByTestId("data-table")).toBeNull();
    rerender(<MarkdownRenderer content={markdown} agentOutput />);
    expect(screen.getByRole("table")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "TABLE_CHART$LINE" }));
    expect(
      screen.getByRole("img", { name: "TABLE_CHART$DESCRIPTION" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TABLE_CHART$TABLE" }));
    expect(screen.getByRole("table")).toHaveTextContent("0.9");
  });
  it("requires numeric X for scatter and caps selected series at six", () => {
    const headers = ["name", ...Array.from({ length: 8 }, (_, i) => `y${i}`)];
    const md = `|${headers.join("|")}|\n|${headers.map(() => "---").join("|")}|\n|label|1|2|3|4|5|6|7|8|`;
    render(<MarkdownRenderer content={md} agentOutput />);
    expect(
      screen.getByRole("button", { name: "TABLE_CHART$SCATTER" }),
    ).toBeDisabled();
    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes.slice(2, 6)) fireEvent.click(checkbox);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(6);
    expect(checkboxes[6]).toBeDisabled();
  });
});

describe("sanitized math", () => {
  it("renders inline, display and fenced math in agent output", () => {
    const { container } = render(
      <MarkdownRenderer
        agentOutput
        content={"Loss $x^2$\n\n$$\n\\frac{a}{b}\n$$\n\n```math\nx+y\n```"}
      />,
    );
    expect(container.querySelectorAll(".katex")).toHaveLength(3);
    expect(container.querySelectorAll("math")).toHaveLength(3);
  });
  it("leaves invalid formulas readable and blocks trusted HTML commands", () => {
    const { container } = render(
      <MarkdownRenderer
        agentOutput
        content={
          '$\\notACommand{x}$\n\n$\\href{javascript:alert(1)}{attack}$\n\n<span style="position:fixed" onclick="alert(1)" class="math-inline">x</span>'
        }
      />,
    );
    expect(container.textContent).toContain("notACommand");
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector("[onclick]")).toBeNull();
    expect(container.querySelector('[style*="fixed"]')).toBeNull();
    expect(container.querySelector("span.math-inline")).toBeNull();
  });
});
