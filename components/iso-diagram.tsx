"use client";

/*
 * Shared kit for the isometric glow diagrams (VoiceLoopFlow, ArchitectureFlow).
 *
 * The projection kernel and the "only what is live glows" rule follow the
 * iso-glow skill. Structure is drawn once in a static base SVG using theme
 * tokens; every lit or moving part is its own small absolutely positioned
 * layer, so the browser only ever animates `opacity` and `transform` on
 * composited layers. Styles live in app/global.css under `.iso-diagram`.
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
    <div className="iso-stage relative w-full" style={{ aspectRatio: `${round(view.w)} / ${round(view.h)}` }}>
      <svg aria-label={label} className="absolute inset-0 size-full" role="img" viewBox={viewBox}>
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
      <svg className="block size-full overflow-visible" viewBox={`${round(box.x)} ${round(box.y)} ${round(box.w)} ${round(box.h)}`}>
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
 * Sound rings on a horizontal plane: the front half of a circle, so the back
 * half reads as hidden behind the object. Two rings expand and fade in a loop.
 */
export function IsoRings({ center, radius, on }: { center: Vec3; radius: number; on: boolean }) {
  const [cx, cy, cz] = center;
  const a = radius / Math.SQRT2;
  const box = bounds(
    [
      [cx + a, cy - a, cz],
      [cx - a, cy + a, cz],
      [cx + radius, cy + radius, cz],
      [cx + a, cy + a, cz],
      [cx, cy + radius, cz],
      [cx + radius, cy, cz],
    ],
    6,
  );
  const [ox, oy] = iso(cx, cy, cz);
  const origin = `${percent((ox - box.x) / box.w)} ${percent((oy - box.y) / box.h)}`;
  const ring = (
    <g transform={onTop(cx, cy, cz)}>
      <path className="iso-lit-glow" d={`M ${round(a)} ${round(-a)} A ${radius} ${radius} 0 0 1 ${round(-a)} ${round(a)}`} />
      <path className="iso-lit" d={`M ${round(a)} ${round(-a)} A ${radius} ${radius} 0 0 1 ${round(-a)} ${round(a)}`} />
    </g>
  );

  return (
    <>
      <IsoLayer box={box} className="iso-ring" on={on} style={{ transformOrigin: origin }}>
        {ring}
      </IsoLayer>
      <IsoLayer box={box} className="iso-ring" on={on} style={{ transformOrigin: origin, animationDelay: "900ms" }}>
        {ring}
      </IsoLayer>
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
