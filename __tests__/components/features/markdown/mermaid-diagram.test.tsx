import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "#/components/features/markdown/markdown-renderer";
import {
  MERMAID_MAX_SOURCE_CHARS,
  prepareMermaidSource,
  sanitizeMermaidSvg,
} from "#/components/features/markdown/mermaid-diagram";
import { UIThemeContext } from "#/themes/ui-theme-context";

const mermaidApi = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(),
  parseError: undefined as (() => void) | undefined,
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({
  default: mermaidApi,
}));

const FENCE = ["```mermaid", "graph TD", "A-->B", "```"].join("\n");
const SAFE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><text>rendered-node</text></svg>';
const HOSTILE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg">',
  '<defs><filter id="shadow"><feDropShadow dx="1" dy="1"/></filter></defs>',
  "<script>alert(1)</script>",
  '<foreignObject><div onclick="alert(1)">x</div></foreignObject>',
  '<a href="javascript:alert(1)"><text>bad</text></a>',
  '<rect id="box" width="10" height="10" style="fill:url(https://evil.example/x)"></rect>',
  "</svg>",
].join("");

describe("mermaid diagrams", () => {
  beforeEach(() => {
    mermaidApi.initialize.mockClear();
    mermaidApi.parse.mockReset();
    mermaidApi.render.mockReset();
    mermaidApi.parse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mermaidApi.render.mockResolvedValue({ svg: SAFE_SVG });
  });

  it("strips config blocks that could relax diagram security", () => {
    const source = [
      "---",
      "config:",
      "  securityLevel: loose",
      "---",
      '%%{init: {"securityLevel":"loose","htmlLabels":true}}%%',
      "graph TD",
      "A-->B",
    ].join("\n");

    expect(prepareMermaidSource(source)).toBe("graph TD\nA-->B");
  });

  it("drops active content from the svg mermaid returns", () => {
    const clean = sanitizeMermaidSvg(HOSTILE_SVG);

    expect(clean).toContain("<rect");
    expect(clean).toContain("<feDropShadow");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("foreignObject");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("https://evil.example");
    expect(clean).not.toContain("onclick");
  });

  it("renders an agent mermaid fence as a diagram and keeps the source copyable", async () => {
    render(<MarkdownRenderer agentOutput content={FENCE} />);

    expect(
      await screen.findByRole("img", { name: "MERMAID$DIAGRAM" }),
    ).toHaveTextContent("rendered-node");
    expect(screen.getByTestId("copy-to-clipboard")).toBeInTheDocument();
    expect(screen.queryByText(/graph TD/)).toBeNull();
    expect(mermaidApi.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: "strict",
        htmlLabels: false,
        theme: "dark",
      }),
    );
  });

  it("keeps a hostile diagram strict and removes active svg content", async () => {
    mermaidApi.render.mockResolvedValue({ svg: HOSTILE_SVG });
    const hostile = [
      "```mermaid",
      '%%{init: {"securityLevel":"loose"}}%%',
      "graph TD",
      "A-->B",
      "```",
    ].join("\n");

    render(<MarkdownRenderer agentOutput content={hostile} />);

    const diagram = await screen.findByTestId("mermaid-diagram");
    expect(diagram.querySelector("script")).toBeNull();
    expect(diagram.querySelector("foreignObject")).toBeNull();
    expect(diagram.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(diagram.querySelector("rect")).not.toBeNull();
    const renderedSource = String(mermaidApi.render.mock.calls.at(-1)?.[1]);
    expect(renderedSource).not.toContain("securityLevel");
    expect(renderedSource).toContain("graph TD");
  });

  it("shows the fence text when the diagram does not parse", async () => {
    mermaidApi.parse.mockResolvedValue(false);

    render(
      <MarkdownRenderer
        agentOutput
        content={["```mermaid", "not a diagram", "```"].join("\n")}
      />,
    );

    await screen.findByText(/not a diagram/);
    expect(screen.queryByRole("img", { name: "MERMAID$DIAGRAM" })).toBeNull();
  });

  it("uses the light mermaid theme when the surrounding ui is light", async () => {
    render(
      <UIThemeContext.Provider value="light">
        <MarkdownRenderer agentOutput content={FENCE} />
      </UIThemeContext.Provider>,
    );

    await screen.findByRole("img", { name: "MERMAID$DIAGRAM" });
    expect(mermaidApi.initialize.mock.calls.at(-1)?.[0]).toMatchObject({
      theme: "default",
    });
  });

  it("does not send an oversized fence to mermaid", async () => {
    const huge = `${"x".repeat(MERMAID_MAX_SOURCE_CHARS)}\nA-->B`;
    render(
      <MarkdownRenderer
        agentOutput
        content={["```mermaid", huge, "```"].join("\n")}
      />,
    );

    await waitFor(() => expect(screen.getByText(/A-->B/)).toBeInTheDocument());
    expect(mermaidApi.parse).not.toHaveBeenCalled();
  });

  it("leaves other fenced languages as code", () => {
    render(
      <MarkdownRenderer
        agentOutput
        content={["```js", "const n = 1;", "```"].join("\n")}
      />,
    );

    expect(mermaidApi.render).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: "MERMAID$DIAGRAM" })).toBeNull();
  });
});
