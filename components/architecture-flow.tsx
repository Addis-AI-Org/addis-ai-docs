"use client";

import {
  GlowLine,
  IsoBox,
  IsoLayer,
  IsoPulse,
  IsoStage,
  bounds,
  boxCorners,
  iso,
  onFront,
  onSide,
  onTop,
  useIsoLoop,
  useMediaQuery,
  type Rect,
  type Vec3,
} from "./iso-diagram";

/*
 * Isometric secure request path: client app, your backend inside a dashed
 * secure zone (it holds the API key), and the Addis AI API. Requests travel on
 * the back lane of each wire and responses return on the front lane.
 */

const GAP = 150; // tile centre to tile centre, along +x
const HALF = 38; // half tile width
const TILE_H = 10;
const TOP_Z = TILE_H;
const ZONE = 58; // half width of the secure zone around the backend
const REQUEST_LANE = -7;
const RESPONSE_LANE = 7;

const nodes = [
  { label: "Client app", activationStep: 0 },
  { label: "Your backend", activationStep: 2 },
  { label: "Addis AI", activationStep: 4 },
];

const statusMessages = [
  "Waiting for a client request...",
  "Client sends the payload to your backend...",
  "Your backend validates the request...",
  "Your backend adds the API key and forwards the request...",
  "Addis AI processes the authenticated request...",
  "Addis AI returns the response to your backend...",
  "Your backend returns the response to the client...",
  "Request path complete — the API key never left your backend.",
];

const durations = [1400, 1100, 1500, 1100, 1500, 1100, 1100, 2800];

const VIEW: Rect = { x: -76, y: -84, w: 460, h: 280 };

const centerX = (index: number) => index * GAP;
const CLIENT = centerX(0);
const BACKEND = centerX(1);
const ADDIS = centerX(2);

function wireEnds(index: number, lane: number): [Vec3, Vec3] {
  const x = centerX(index);
  // The far end stops where the next tile's top face starts to cover it.
  return [
    [x + HALF, lane, 1],
    [x + GAP - HALF - (TILE_H - 1), lane, 1],
  ];
}

const wires = [
  { index: 0, lane: REQUEST_LANE, label: "Sends data", activationStep: 1, reverse: false },
  { index: 1, lane: REQUEST_LANE, label: "+ API key", activationStep: 3, reverse: false },
  { index: 1, lane: RESPONSE_LANE, label: null, activationStep: 5, reverse: true },
  { index: 0, lane: RESPONSE_LANE, label: null, activationStep: 6, reverse: true },
];

// One label per connection, printed on the ground in front of both lanes,
// where no object can cover it.
const LABEL_Y = 11;

/* ---------- objects ---------- */

function Tile({ index }: { index: number }) {
  const cx = centerX(index);
  return (
    <g>
      <IsoBox d={HALF * 2} h={TILE_H} w={HALF * 2} x={cx - HALF} y={-HALF} z={0} />
      <g transform={onTop(cx - HALF, -HALF, TILE_H)}>
        <rect className="iso-detail" height={HALF * 2 - 10} rx={4} width={HALF * 2 - 10} x={5} y={5} />
      </g>
      <g transform={onFront(cx - HALF, HALF, TILE_H)}>
        <text className="iso-print" fontSize={6} x={5} y={7.5}>
          {String(index + 1).padStart(2, "0")}
        </text>
      </g>
    </g>
  );
}

const bubbles = [
  [4, 10, 15],
  [12, 18, 15],
  [4, 26, 19],
] as const;

function Phone({ lit = false }: { lit?: boolean }) {
  return (
    <g>
      {lit ? null : (
        <>
          <IsoBox d={10} h={5} w={24} x={CLIENT - 12} y={-6} z={TOP_Z} />
          <IsoBox d={5} h={50} w={32} x={CLIENT - 16} y={-2} z={TOP_Z + 5} />
        </>
      )}
      <g transform={onFront(CLIENT - 16, 3, TOP_Z + 55)}>
        {lit ? (
          <>
            <rect className="iso-lit-fill" height={43} rx={2} width={27} x={2.5} y={3.5} />
            {bubbles.map(([x, y, w]) => (
              <rect className="iso-lit" height={5} key={y} rx={1.5} width={w} x={x} y={y} />
            ))}
          </>
        ) : (
          <>
            <rect className="iso-recess" height={43} rx={2} width={27} x={2.5} y={3.5} />
            <line className="iso-detail" x1={12} x2={20} y1={1.8} y2={1.8} />
          </>
        )}
      </g>
    </g>
  );
}

const bays = [0, 1, 2, 3];

function Server({ lit = false }: { lit?: boolean }) {
  return (
    <g>
      {lit ? null : (
        <>
          <IsoBox d={44} h={50} w={44} x={BACKEND - 22} y={-22} z={TOP_Z} />
          <g className="iso-detail" transform={onSide(BACKEND + 22, 22, TOP_Z + 50)}>
            {Array.from({ length: 11 }, (_, k) => 5 + k * 3.4).map((u) => (
              <line key={u} x1={u} x2={u} y1={6} y2={44} />
            ))}
          </g>
        </>
      )}
      <g transform={onFront(BACKEND - 22, 22, TOP_Z + 50)}>
        {bays.map((k) => (
          <g key={k}>
            <rect
              className={lit ? "iso-lit-fill" : "iso-recess"}
              height={8}
              rx={1}
              width={36}
              x={4}
              y={5 + k * 11}
            />
            <circle
              className={lit ? "iso-accent" : "iso-outline"}
              cx={33}
              cy={9 + k * 11}
              r={1.4}
            />
          </g>
        ))}
      </g>
    </g>
  );
}

function KeyGlyph({ lit = false }: { lit?: boolean }) {
  return (
    <g className={lit ? "iso-lit" : "iso-detail"} transform={onTop(BACKEND - 22, -22, TOP_Z + 50)}>
      <circle cx={14} cy={22} r={5} />
      <path d="M 19 22 H 34 M 28 22 V 27 M 32 22 V 26" />
    </g>
  );
}

function SecureZone({ lit = false }: { lit?: boolean }) {
  return (
    <g transform={onTop(BACKEND - ZONE, -ZONE, 0)}>
      <rect
        className={lit ? "iso-lit iso-dashed" : "iso-detail iso-dashed"}
        height={ZONE * 2}
        rx={4}
        width={ZONE * 2}
        x={0}
        y={0}
      />
      <text
        className={lit ? "iso-print iso-print-lit" : "iso-print"}
        fontSize={6.5}
        x={6}
        y={ZONE * 2 - 5}
      >
        SECURE ZONE
      </text>
    </g>
  );
}

// Screen-aligned padlock badge floating above the server.
const [LOCK_X] = iso(BACKEND, 0, 0);
const LOCK_Y = -24;

function Lock({ lit = false }: { lit?: boolean }) {
  const x = LOCK_X;
  const y = LOCK_Y;
  return (
    <g className={lit ? "iso-lit" : "iso-outline"}>
      <path d={`M ${x - 4} ${y} V ${y - 4} A 4 4 0 0 1 ${x + 4} ${y - 4} V ${y}`} />
      <rect
        className={lit ? "iso-lit-fill" : "iso-recess"}
        height={11}
        rx={2}
        width={14}
        x={x - 7}
        y={y}
      />
    </g>
  );
}

const plateZ = [18, 31, 44];

function Plates({ litFrom }: { litFrom?: number }) {
  // `litFrom` draws plate N lit and the plates above it unlit, so a lit lower
  // plate never paints over a plate that sits in front of it.
  return (
    <g>
      {plateZ.slice(litFrom ?? 0).map((z, offset) => (
        <IsoBox
          d={52}
          h={4}
          key={z}
          lit={litFrom !== undefined && offset === 0}
          w={52}
          x={ADDIS - 26}
          y={-26}
          z={z}
        />
      ))}
      <g transform={onTop(ADDIS - 26, -26, plateZ[2] + 4)}>
        <text
          className={litFrom === 2 ? "iso-print iso-print-lit" : "iso-print"}
          fontSize={7.5}
          x={5}
          y={46}
        >
          ADDIS AI
        </text>
      </g>
    </g>
  );
}

function NodeLabel({ index }: { index: number }) {
  const [x, y] = iso(centerX(index), 0, 0);
  return (
    <g>
      <text className="iso-index" x={x + 52} y={y - 58}>
        {String(index + 1).padStart(2, "0")}
      </text>
      <text className="iso-label" x={x + 52} y={y - 44}>
        {nodes[index].label}
      </text>
    </g>
  );
}

function WireLabel({ index, lane, label }: { index: number; lane: number; label: string | null }) {
  if (!label) return null;
  const [from] = wireEnds(index, lane);
  return (
    <g transform={onTop(from[0] + 6, LABEL_Y, 0)}>
      <text className="iso-print" fontSize={6.5} x={0} y={5}>
        {label.toUpperCase()}
      </text>
    </g>
  );
}

function BaseDrawing() {
  return (
    <g>
      <SecureZone />
      {wires.map((wire) => {
        const [from, to] = wireEnds(wire.index, wire.lane);
        const [x1, y1] = iso(...from);
        const [x2, y2] = iso(...to);
        return (
          <g key={`${wire.index}${wire.lane}`}>
            <line className="iso-wire" x1={x1} x2={x2} y1={y1} y2={y2} />
            <WireLabel {...wire} />
          </g>
        );
      })}
      {nodes.map((node, index) => (
        <Tile index={index} key={node.label} />
      ))}
      <Phone />
      <Server />
      <KeyGlyph />
      {[-26, 26].flatMap((dx) =>
        [-26, 26].map((dy) => {
          const [x1, y1] = iso(ADDIS + dx, dy, TOP_Z);
          const [x2, y2] = iso(ADDIS + dx, dy, plateZ[2]);
          return <line className="iso-detail iso-dashed" key={`${dx}${dy}`} x1={x1} x2={x2} y1={y1} y2={y2} />;
        }),
      )}
      <Plates />
      <Lock />
      {nodes.map((node, index) => (
        <NodeLabel index={index} key={node.label} />
      ))}
    </g>
  );
}

function haloAt(cx: number, z: number, rx: number) {
  const [x, y] = iso(cx, 0, z);
  return { cx: x, cy: y, rx, ry: rx * 0.7 };
}

function KeyToken({ at }: { at: Vec3 }) {
  return <IsoBox d={6} h={6} lit w={6} x={at[0] - 3} y={at[1] - 3} z={1} />;
}

export function ArchitectureFlow() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { rootRef, paused, step } = useIsoLoop(durations, reducedMotion);
  const finalStep = statusMessages.length - 1;
  const reached = (activationStep: number) => step >= activationStep;
  const zoneCorners: Vec3[] = [
    [BACKEND - ZONE, -ZONE, 0],
    [BACKEND + ZONE, -ZONE, 0],
    [BACKEND - ZONE, ZONE, 0],
    [BACKEND + ZONE, ZONE, 0],
  ];

  return (
    <div
      className="iso-diagram not-prose addis-offset-shell addis-panel my-10 w-full overflow-hidden"
      data-paused={paused}
      ref={rootRef}
    >
      <div className="flex items-center justify-between border-b border-fd-border px-5 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-foreground">
          Secure request path
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground">
          {step === finalStep
            ? "Complete"
            : `Phase ${String(step + 1).padStart(2, "0")} / 07`}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="mx-auto w-full min-w-[20rem] max-w-[34rem] px-4 py-6 sm:px-8">
          <IsoStage
            base={<BaseDrawing />}
            label="Secure request path: Client app, then Your backend inside the secure zone holding the API key, then Addis AI, and the response back."
            view={VIEW}
          >
            {/* The zone layer repeats the backend tile and server on top, so
                the lit dashed line stays hidden behind them. */}
            <IsoLayer
              box={bounds([...zoneCorners, ...boxCorners(BACKEND - 22, -22, TOP_Z, 44, 44, 50)], 8)}
              on={reached(2)}
            >
              <SecureZone lit />
              <Tile index={1} />
              <Server />
              <KeyGlyph />
            </IsoLayer>

            {wires.map((wire) => {
              const [from, to] = wireEnds(wire.index, wire.lane);
              return (
                <IsoLayer
                  box={bounds([from, to, [from[0], LABEL_Y, 0], [to[0], LABEL_Y + 6, 0]], 8)}
                  key={`wire-${wire.index}${wire.lane}`}
                  on={reached(wire.activationStep)}
                >
                  <GlowLine from={from} to={to} />
                  {wire.label ? (
                    <g transform={onTop(from[0] + 6, LABEL_Y, 0)}>
                      <text className="iso-print iso-print-lit" fontSize={6.5} x={0} y={5}>
                        {wire.label.toUpperCase()}
                      </text>
                    </g>
                  ) : null}
                </IsoLayer>
              );
            })}

            <IsoLayer
              box={bounds(boxCorners(CLIENT - 16, 3, TOP_Z + 5, 32, 0.1, 50), 24)}
              halo={haloAt(CLIENT, TOP_Z + 30, 34)}
              on={reached(0)}
            >
              <Phone lit />
            </IsoLayer>

            <IsoLayer
              box={bounds(boxCorners(BACKEND - 22, 22, TOP_Z, 44, 0.1, 50), 26)}
              halo={haloAt(BACKEND, TOP_Z + 28, 40)}
              on={reached(2)}
            >
              <Server lit />
            </IsoLayer>
            <IsoLayer
              box={{ x: LOCK_X - 14, y: LOCK_Y - 14, w: 28, h: 30 }}
              delay={200}
              on={reached(2)}
            >
              <Lock lit />
            </IsoLayer>
            <IsoLayer
              box={bounds(boxCorners(BACKEND - 22, -22, TOP_Z + 50, 44, 44, 0.1), 6)}
              on={reached(3)}
            >
              <KeyGlyph lit />
            </IsoLayer>

            {plateZ.map((z, index) => (
              <IsoLayer
                box={bounds(boxCorners(ADDIS - 26, -26, z, 52, 52, plateZ[2] + 4 - z), index === 0 ? 30 : 6)}
                delay={index * 160}
                halo={index === 0 ? haloAt(ADDIS, 30, 52) : undefined}
                key={z}
                on={reached(4)}
              >
                <Plates litFrom={index} />
              </IsoLayer>
            ))}

            {wires.map((wire) => {
              const [start, end] = wireEnds(wire.index, wire.lane);
              const [from, to] = wire.reverse ? [end, start] : [start, end];
              return (
                <IsoPulse
                  active={step === wire.activationStep}
                  from={from}
                  key={`pulse-${wire.index}${wire.lane}`}
                  paused={paused}
                  size={wire.activationStep === 3 ? 16 : 14}
                  to={to}
                >
                  {wire.activationStep === 3 ? <KeyToken at={from} /> : undefined}
                </IsoPulse>
              );
            })}
          </IsoStage>
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-14 items-center gap-3 border-t border-fd-border px-5 py-3"
      >
        <span aria-hidden="true" className="iso-status-dot size-2 shrink-0" />
        <span className="text-sm font-medium text-fd-muted-foreground">
          {statusMessages[step]}
        </span>
      </div>
    </div>
  );
}
