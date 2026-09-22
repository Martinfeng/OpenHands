import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import type { MermaidConfig } from "mermaid";
import { I18nKey } from "#/i18n/declaration";
import type { ResolvedAppearance } from "#/themes/appearance-palette";
import { useUITheme } from "#/themes/ui-theme-context";
import { CopyableContentWrapper } from "#/components/shared/buttons/copyable-content-wrapper";

/** Fence info string recognized as a diagram. */
export const MERMAID_FENCE_LANGUAGE = "mermaid";

/** Matches Mermaid's own maxTextSize so a huge fence cannot lock the page. */
export const MERMAID_MAX_SOURCE_CHARS = 50_000;

const MERMAID_RENDER_DELAY_MS = import.meta.env.MODE === "test" ? 0 : 200;

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const INIT_DIRECTIVE = /%%\{[\s\S]*?\}%%/g;

const SVG_FORBIDDEN_TAGS = [
  "foreignObject",
  "script",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
  "link",
  "meta",
  "image",
];

// DOMPurify serializes SVG through HTML, which lowercases camelCase tags
// such as feDropShadow and clipPath. SVG then ignores those elements.
const SVG_CAMEL_CASE_TAGS = [
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMergeNode",
  "feMerge",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "linearGradient",
  "radialGradient",
  "textPath",
].sort((left, right) => right.length - left.length);

/**
 * Diagram front matter and `%%{init}%%` directives can override site config,
 * including htmlLabels and sanitizer options. securityLevel is also locked
 * below; stripping the blocks keeps theme and security on the values we set.
 */
export function prepareMermaidSource(source: string): string {
  return source.replace(FRONT_MATTER, "").replace(INIT_DIRECTIVE, "").trim();
}

function restoreSvgTagCase(svg: string): string {
  return SVG_CAMEL_CASE_TAGS.reduce(
    (restored, tag) =>
      restored
        .replaceAll(`<${tag.toLowerCase()}`, `<${tag}`)
        .replaceAll(`</${tag.toLowerCase()}>`, `</${tag}>`),
    svg,
  );
}

export function sanitizeMermaidSvg(svg: string): string {
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["style"],
    FORBID_TAGS: SVG_FORBIDDEN_TAGS,
    PARSER_MEDIA_TYPE: "image/svg+xml",
  });
  if (!clean.includes("<svg")) {
    throw new Error("Mermaid SVG was rejected");
  }
  // Arrowheads use url(#id). Drop only external or scriptable targets.
  const withoutExternalUrls = clean.replace(
    /url\(\s*(['"]?)\s*(?:https?:|\/\/|javascript:)/gi,
    "url($1#",
  );
  return restoreSvgTagCase(withoutExternalUrls);
}

function mermaidConfig(appearance: ResolvedAppearance): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    htmlLabels: false,
    maxTextSize: MERMAID_MAX_SOURCE_CHARS,
    logLevel: "fatal",
    theme: appearance === "dark" ? "dark" : "default",
    look: "classic",
    fontFamily: "inherit",
    // Replacing this list drops Mermaid's defaults, so the locked keys are repeated.
    secure: [
      "secure",
      "securityLevel",
      "startOnLoad",
      "maxTextSize",
      "htmlLabels",
      "suppressErrorRendering",
      "dompurifyConfig",
    ],
  };
}

let renderQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Render one diagram. `initialize` is global, so theme and security stay
 * paired with the source by running one diagram at a time. Click binders
 * from Mermaid are intentionally unused.
 */
export function renderMermaidDiagram(
  source: string,
  appearance: ResolvedAppearance,
  id: string,
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared || prepared.length > MERMAID_MAX_SOURCE_CHARS) {
    return Promise.reject(new Error("Mermaid source was rejected"));
  }

  return enqueue(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize(mermaidConfig(appearance));
    mermaid.parseError = () => undefined;
    const parsed = await mermaid.parse(prepared, { suppressErrors: true });
    if (!parsed) {
      throw new Error("Mermaid source did not parse");
    }

    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.left = "-10000px";
    document.body.appendChild(host);
    try {
      const { svg } = await mermaid.render(id, prepared, host);
      return sanitizeMermaidSvg(svg);
    } finally {
      host.remove();
      document.getElementById(id)?.remove();
    }
  });
}

function MermaidSource({ source }: { source: string }) {
  return (
    <pre className="overflow-auto rounded border border-surface-raised bg-surface-raised p-[1em] text-foreground">
      <code>{source}</code>
    </pre>
  );
}

export function MermaidDiagram({ source }: { source: string }) {
  const appearance = useUITheme();
  const { t } = useTranslation("openhands");
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const attempt = useRef(0);
  const [svg, setSvg] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "ready" | "fallback">(
    "pending",
  );

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setStatus("pending");
    const timer = window.setTimeout(() => {
      attempt.current += 1;
      const id = `ohmermaid${reactId}${attempt.current}`;
      void renderMermaidDiagram(source, appearance, id).then(
        (next) => {
          if (!cancelled) {
            setSvg(next);
            setStatus("ready");
          }
        },
        () => {
          if (!cancelled) {
            setSvg(null);
            setStatus("fallback");
          }
        },
      );
    }, MERMAID_RENDER_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appearance, reactId, source]);

  return (
    <CopyableContentWrapper text={source}>
      {status === "ready" && svg ? (
        <div
          data-testid="mermaid-diagram"
          role="img"
          aria-label={t(I18nKey.MERMAID$DIAGRAM)}
          className="max-w-full overflow-x-auto rounded-lg border border-surface-raised bg-surface-raised p-[1em] [&_svg]:h-auto [&_svg]:max-w-full"
          // Sanitized in sanitizeMermaidSvg. Mermaid only returns a markup string.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : status === "fallback" ? (
        <MermaidSource source={source} />
      ) : (
        <div
          data-testid="mermaid-pending"
          aria-busy="true"
          aria-label={t(I18nKey.MERMAID$DIAGRAM)}
          className="min-h-24 rounded-lg border border-surface-raised bg-surface-raised"
        />
      )}
    </CopyableContentWrapper>
  );
}
