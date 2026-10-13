"use client";

/*
 * Shared kit for the isometric glow diagrams (VoiceLoopFlow, ArchitectureFlow).
 *
 * The projection kernel and the "only what is live glows" rule follow the
 * iso-glow skill. Structure is drawn once in a static base SVG using theme
 * tokens; every lit or moving part is its own small absolutely positioned
 * layer, so the browser only ever animates `opacity` and `transform` on
 * composited layers. Styles live in ISO_CSS below and ship with the component.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "../lib/cn";

/*
 * Styles ship with the component, not in app/global.css, so the diagram can
 * never render without them. React 19 hoists this <style> into <head> and
 * de-duplicates it by `href`, so two diagrams on a page share one copy.
 * Teal is the only accent; motion touches transform and opacity only.
 */
const ISO_CSS = `
.iso-diagram {
  --iso-accent: #27cdfe;
  /* Accent strokes and text follow the theme primary (darker in light mode). */
  --iso-ink: var(--color-fd-primary);
  --iso-glow: 0.2;
  --iso-haze: 0.07;
  --iso-top: color-mix(in oklab, var(--color-fd-foreground) 3%, var(--color-fd-background));
  --iso-front: color-mix(in oklab, var(--color-fd-foreground) 7%, var(--color-fd-background));
  --iso-side: color-mix(in oklab, var(--color-fd-foreground) 11%, var(--color-fd-background));
  --iso-recess: color-mix(in oklab, var(--color-fd-foreground) 13%, var(--color-fd-background));
  --iso-line: color-mix(in oklab, var(--color-fd-foreground) 42%, var(--color-fd-background));
  --iso-detail: color-mix(in oklab, var(--color-fd-foreground) 22%, var(--color-fd-background));
  --iso-print: color-mix(in oklab, var(--color-fd-foreground) 52%, var(--color-fd-background));
}

.dark .iso-diagram {
  --iso-glow: 0.42;
  --iso-haze: 0.11;
}

/* Structural layout, kept here (not in utility classes) so overlays always line up. */
.iso-stage {
  position: relative;
  width: 100%;
}

.iso-stage > svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.iso-layer > svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.iso-stage :where(polygon, line, polyline, path, rect, circle, ellipse) {
  vector-effect: non-scaling-stroke;
}

.iso-box polygon {
  stroke: var(--iso-line);
  stroke-width: 1;
  stroke-linejoin: round;
}

.iso-top { fill: var(--iso-top); }
.iso-front { fill: var(--iso-front); }
.iso-side { fill: var(--iso-side); }

.iso-box-lit polygon { stroke: var(--iso-ink); }
.iso-box-lit .iso-top { fill: color-mix(in oklab, var(--iso-accent) 64%, var(--color-fd-background)); }
.iso-box-lit .iso-front { fill: color-mix(in oklab, var(--iso-accent) 40%, var(--color-fd-background)); }
.iso-box-lit .iso-side { fill: color-mix(in oklab, var(--iso-accent) 26%, var(--color-fd-background)); }

.iso-outline,
.iso-detail,
.iso-wire,
.iso-lit,
.iso-lit-glow {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.iso-outline { stroke: var(--iso-line); stroke-width: 1; }
.iso-detail { stroke: var(--iso-detail); stroke-width: 1; }
.iso-wire { stroke: var(--iso-detail); stroke-width: 1.25; }
.iso-dashed { stroke-dasharray: 3 3; }
.iso-recess { fill: var(--iso-recess); stroke: var(--iso-line); stroke-width: 1; }

.iso-lit { stroke: var(--iso-ink); stroke-width: 1.5; }
.iso-lit-glow { stroke: var(--iso-accent); stroke-width: 7; stroke-opacity: var(--iso-glow); }
.iso-lit-fill {
  fill: color-mix(in oklab, var(--iso-accent) 48%, var(--color-fd-background));
  stroke: var(--iso-ink);
  stroke-width: 1;
}
.iso-accent { fill: var(--iso-accent); }
.iso-halo { opacity: var(--iso-glow); }
.iso-haze { opacity: var(--iso-haze); }

.iso-print {
  fill: var(--iso-print);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.iso-print-lit { fill: var(--iso-ink); }

.iso-index {
  fill: var(--color-fd-muted-foreground);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 8.5px;
  letter-spacing: 0.14em;
}

.iso-label {
  fill: var(--color-fd-foreground);
  font-size: 12px;
  font-weight: 600;
}

.iso-status-dot {
  background: var(--iso-accent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--iso-accent) 18%, transparent);
}

.iso-layer {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity;
}

.iso-layer[data-on="true"] { opacity: 1; }
.iso-occluder { transition: none; }
.iso-pulse { will-change: transform, opacity; }

.iso-ring { will-change: transform, opacity; }
.iso-ring[data-on="true"] {
  animation: iso-ring 1.8s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
}
.iso-diagram[data-paused="true"] .iso-ring { animation-play-state: paused; }

@keyframes iso-ring {
  0% { opacity: 0; transform: scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.35); }
}

/* Reduced motion: the components hold the final, fully lit frame. */
@media (prefers-reduced-motion: reduce) {
  .iso-layer { transition: none; }
  .iso-ring[data-on="true"] { animation: none; opacity: 0.6; }
}
`;

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

export type Vec3 = readonly [number, number, number];
export type Point = readonly [number, number];
export type Rect = { x: number; y: number; w: number; h: number };

/** World (x, y, z) to screen. +x runs down-right, +y down-left, +z up. */
export const iso = (x: number, y: number, z: number): Point => [
  (x - y) * COS,
  (x + y) * SIN - z,
];

const round = (n: number) => Math.round(n * 100) / 100;

export function points(...vertices: Vec3[]) {
  return vertices
    .map((v) => iso(...v).map(round).join(","))
    .join(" ");
}

function plane(origin: Vec3, u: Vec3, v: Vec3) {
  const [ox, oy] = iso(...origin);
  const [ux, uy] = iso(...u);
  const [vx, vy] = iso(...v);
  return `matrix(${round(ux)} ${round(uy)} ${round(vx)} ${round(vy)} ${round(ox)} ${round(oy)})`;
}

/** Plane transforms: draw ordinary rects, lines and text inside and they land on the face. */
export const onTop = (x: number, y: number, z: number) =>
  plane([x, y, z], [1, 0, 0], [0, 1, 0]);
/** The y = max face (lower left). Pass the face's top-left corner. */
export const onFront = (x: number, y: number, z: number) =>
  plane([x, y, z], [1, 0, 0], [0, 0, -1]);
/** The x = max face (lower right). Pass the face's top-left corner. */
export const onSide = (x: number, y: number, z: number) =>
  plane([x, y, z], [0, -1, 0], [0, 0, -1]);

/** Screen-space bounds of a set of world points, padded. */
export function bounds(vertices: Vec3[], pad = 0): Rect {
  const projected = vertices.map((v) => iso(...v));
  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return {
    x,
    y,
    w: Math.max(...xs) + pad - x,
    h: Math.max(...ys) + pad - y,
  };
}

export function boxCorners(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
): Vec3[] {
  return [
    [x, y, z],
    [x + w, y, z],
    [x, y + d, z],
    [x + w, y + d, z],
    [x, y, z + h],
    [x + w, y, z + h],
    [x, y + d, z + h],
    [x + w, y + d, z + h],
  ];
}

type BoxProps = {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  lit?: boolean;
};

/** A box is its three visible faces, drawn opaque. Paint back to front. */
export function IsoBox({ x, y, z, w, d, h, lit = false }: BoxProps) {
  return (
    <g className={lit ? "iso-box iso-box-lit" : "iso-box"}>
      <polygon
        className="iso-top"
        points={points(
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        )}
      />
      <polygon
        className="iso-front"
        points={points(
          [x, y + d, z + h],
          [x + w, y + d, z + h],
          [x + w, y + d, z],
          [x, y + d, z],
        )}
      />
      <polygon
        className="iso-side"
        points={points(
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x + w, y + d, z],
          [x + w, y, z],
        )}
      />
    </g>
  );
}

/** A lit stroke: a wide translucent accent under a crisp accent hairline. */
export function GlowLine({ from, to }: { from: Vec3; to: Vec3 }) {
  const [x1, y1] = iso(...from);
  const [x2, y2] = iso(...to);
  return (
    <>
      <line className="iso-lit-glow" x1={x1} x2={x2} y1={y1} y2={y2} />
      <line className="iso-lit" x1={x1} x2={x2} y1={y1} y2={y2} />
    </>
  );
}

const StageContext = createContext<Rect>({ x: 0, y: 0, w: 1, h: 1 });

const percent = (n: number) => `${round(n * 100)}%`;

function placement(view: Rect, box: Rect): CSSProperties {
  return {
    left: percent((box.x - view.x) / view.w),
    top: percent((box.y - view.y) / view.h),
    width: percent(box.w / view.w),
    height: percent(box.h / view.h),
  };
}

const useSvgId = () => `iso${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

function Halo({ cx, cy, rx, ry, id }: { cx: number; cy: number; rx: number; ry: number; id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" style={{ stopColor: "var(--iso-accent)", stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: "var(--iso-accent)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse className="iso-halo" cx={cx} cy={cy} fill={`url(#${id})`} rx={rx} ry={ry} />
    </>
  );
}

export function IsoStage({
  view,
  label,
  base,
  children,
}: {
  view: Rect;
  label: string;
  base: ReactNode;
  children: ReactNode;
}) {
  const hazeId = useSvgId();
  const viewBox = `${round(view.x)} ${round(view.y)} ${round(view.w)} ${round(view.h)}`;

  return (
    <div className="iso-stage" style={{ aspectRatio: `${round(view.w)} / ${round(view.h)}` }}>
      <style href="addis-iso-diagram" precedence="medium">
        {ISO_CSS}
      </style>
      <svg aria-label={label} role="img" viewBox={viewBox}>
        <defs>
          <radialGradient id={hazeId}>
            <stop offset="0" style={{ stopColor: "var(--iso-accent)", stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: "var(--iso-accent)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <ellipse
          className="iso-haze"
          cx={view.x + view.w / 2}
          cy={view.y + view.h / 2}
          fill={`url(#${hazeId})`}
          rx={view.w / 2}
          ry={view.h / 2}
        />
        {base}
      </svg>
      <StageContext.Provider value={view}>{children}</StageContext.Provider>
    </div>
  );
}

/**
 * One composited overlay. It covers only `box` (screen units) and fades in
 * with opacity when `on` is true.
 */
export function IsoLayer({
  box,
  on,
  delay = 0,
  halo,
  className,
  style,
  layerRef,
  children,
}: {
  box: Rect;
  on: boolean;
  delay?: number;
  halo?: { cx: number; cy: number; rx: number; ry: number };
  className?: string;
  style?: CSSProperties;
  layerRef?: RefObject<HTMLDivElement | null>;
  children?: ReactNode;
}) {
  const view = useContext(StageContext);
  const haloId = useSvgId();

  return (
    <div
      aria-hidden="true"
      className={cn("iso-layer", className)}
      data-on={on}
      ref={layerRef}
      style={{
        ...placement(view, box),
        transitionDelay: on ? `${delay}ms` : "0ms",
        ...style,
      }}
    >
      <svg viewBox={`${round(box.x)} ${round(box.y)} ${round(box.w)} ${round(box.h)}`}>
        {halo ? <Halo id={haloId} {...halo} /> : null}
        {children}
      </svg>
    </div>
  );
}

/**
 * A dot of light (or any small mark drawn at `from`) that travels in a
 * straight line to `to` while `active`. Uses the Web Animations API on
 * transform and opacity, so it runs on the compositor and can be paused.
 */
export function IsoPulse({
  from,
  to,
  active,
  paused,
  duration = 950,
  size = 14,
  children,
}: {
  from: Vec3;
  to: Vec3;
  active: boolean;
  paused: boolean;
  duration?: number;
  size?: number;
  children?: ReactNode;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const haloId = useSvgId();
  const [fx, fy] = iso(...from);
  const [tx, ty] = iso(...to);
  const box = { x: fx - size, y: fy - size, w: size * 2, h: size * 2 };
  const dx = round(((tx - fx) / box.w) * 100);
  const dy = round(((ty - fy) / box.h) * 100);

  useEffect(() => {
    const layer = layerRef.current;
    if (!active || !layer || typeof layer.animate !== "function") return;

    const running = layer.animate(
      [
        { transform: "translate(0, 0)", opacity: 0 },
        { opacity: 1, offset: 0.14 },
        { opacity: 1, offset: 0.84 },
        { transform: `translate(${dx}%, ${dy}%)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
    );
    animation.current = running;

    return () => {
      running.cancel();
      animation.current = null;
    };
  }, [active, duration, dx, dy]);

  useEffect(() => {
    const running = animation.current;
    if (!running) return;
    if (paused && running.playState === "running") running.pause();
    if (!paused && running.playState === "paused") running.play();
  }, [paused]);

  return (
    <IsoLayer box={box} className="iso-pulse" layerRef={layerRef} on={false}>
      {children ?? (
        <>
          <Halo cx={fx} cy={fy} id={haloId} rx={size} ry={size} />
          <circle className="iso-accent" cx={fx} cy={fy} r={2.6} />
        </>
      )}
    </IsoLayer>
  );
}

/**
 * Sound rings: full circles on a horizontal plane around an object, expanding
 * and fading in a loop. The back half of each ring is drawn first, then
 * `occluder` (a static copy of the object) covers it, then `children` (the
 * object's lit layer), then the front half, so the ring passes behind the
 * object and in front of it like a real circle would.
 */
export function IsoRings({
  center,
  radius,
  on,
  occluder,
  occluderBox,
  children,
}: {
  center: Vec3;
  radius: number;
  on: boolean;
  occluder: ReactNode;
  occluderBox: Rect;
  children?: ReactNode;
}) {
  const [cx, cy, cz] = center;
  const a = round(radius / Math.SQRT2);
  const circle: Vec3[] = Array.from({ length: 16 }, (_, k) => {
    const angle = (k / 16) * Math.PI * 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), cz];
  });
  const box = bounds(circle, 6);
  const [ox, oy] = iso(cx, cy, cz);
  const origin = `${percent((ox - box.x) / box.w)} ${percent((oy - box.y) / box.h)}`;
  // In plane-local coordinates the far half runs from (-a, a) to (a, -a)
  // through the back corner; the near half continues back to (-a, a).
  const back = `M ${-a} ${a} A ${radius} ${radius} 0 0 1 ${a} ${-a}`;
  const front = `M ${a} ${-a} A ${radius} ${radius} 0 0 1 ${-a} ${a}`;
  const half = (d: string) => (
    <g transform={onTop(cx, cy, cz)}>
      <path className="iso-lit-glow" d={d} />
      <path className="iso-lit" d={d} />
    </g>
  );
  const rings = (d: string) =>
    [0, 900].map((delay) => (
      <IsoLayer
        box={box}
        className="iso-ring"
        key={delay}
        on={on}
        style={{ transformOrigin: origin, animationDelay: `${delay}ms` }}
      >
        {half(d)}
      </IsoLayer>
    ));

  return (
    <>
      {rings(back)}
      <IsoLayer box={occluderBox} className="iso-occluder" on>
        {occluder}
      </IsoLayer>
      {children}
      {rings(front)}
    </>
  );
}

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Steps through `durations` (ms per step) in a loop. Playback pauses while the
 * diagram is off-screen or the tab is hidden. With reduced motion it holds the
 * final step.
 */
export function useIsoLoop(durations: readonly number[], reducedMotion: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const playing = inView && pageVisible && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setStep((current) => (current + 1) % durations.length),
      durations[step],
    );
    return () => window.clearTimeout(timer);
  }, [durations, playing, step]);

  return {
    rootRef,
    paused: !playing,
    step: reducedMotion ? durations.length - 1 : step,
  };
}
