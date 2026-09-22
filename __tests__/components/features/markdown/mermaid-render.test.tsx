import { beforeAll, describe, expect, it } from "vitest";
import { renderMermaidDiagram } from "#/components/features/markdown/mermaid-diagram";

beforeAll(() => {
  // jsdom does not measure SVG text. Size from the label so Mermaid keeps
  // each node label on one line instead of wrapping every character.
  function textWidth(this: Element) {
    return Math.max(8, (this.textContent?.length ?? 1) * 8);
  }
  function box(this: Element) {
    const width = textWidth.call(this);
    return {
      x: 0,
      y: 0,
      width,
      height: 20,
      top: 0,
      right: width,
      bottom: 20,
      left: 0,
      toJSON() {
        return {};
      },
    } as DOMRect;
  }
  for (const prototype of [SVGElement.prototype, Element.prototype]) {
    Object.defineProperty(prototype, "getComputedTextLength", {
      value: textWidth,
      configurable: true,
    });
    Object.defineProperty(prototype, "getBBox", {
      value: box,
      configurable: true,
    });
  }
});

const DEPENDENCY_GRAPH = [
  "graph TD",
  'CP["cp_cust_session_tag_message (ID: 1451)"]',
  'RT_MALL["rt_cust_session_tag_message_mall (ID: 9519)"]',
  'RT_ONLINE["rt_cust_session_tag_message_online (ID: 9517)"]',
  'RT_HOTLINE["rt_cust_session_tag_message_hotline (ID: 9518)"]',
  "CP --> RT_MALL",
  "CP --> RT_ONLINE",
  "CP --> RT_HOTLINE",
].join("\n");

describe("mermaid renderer", () => {
  it("draws a dependency flowchart to sanitized svg", async () => {
    const svg = await renderMermaidDiagram(
      DEPENDENCY_GRAPH,
      "light",
      "ohmermaidintegration",
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("flowchart-CP");
    expect(svg).toContain("flowchart-RT_MALL");
    expect(svg).toContain("flowchart-RT_ONLINE");
    expect(svg).toContain("flowchart-RT_HOTLINE");
    expect(svg).toContain("L_CP_RT_MALL");
    expect(svg).toContain("<feDropShadow");
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("foreignObject");
  }, 30_000);
});
