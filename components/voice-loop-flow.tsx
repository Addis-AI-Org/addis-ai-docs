"use client";

import {
  GlowLine,
  IsoBox,
  IsoLayer,
  IsoPulse,
  IsoRings,
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
 * Isometric voice pipeline: five tiles on a diagonal, joined by wires that
 * carry a pulse of light. Each tile lights up when its stage is reached.
 */

const GAP = 110; // tile centre to tile centre, along +x
const HALF = 28; // half tile width
const TILE_H = 8;
const TOP_Z = TILE_H;

const stages = [
  { label: "User speaks", activationStep: 0 },
  { label: "Transcribe", activationStep: 2 },
  { label: "Reasoning", activationStep: 4 },
  { label: "Synthesize", activationStep: 6 },
  { label: "Play", activationStep: 8 },
];

const connections = [
  { label: "Audio", activationStep: 1 },
  { label: "Text", activationStep: 3 },
  { label: "Text", activationStep: 5 },
  { label: "Audio", activationStep: 7 },
];

const statusMessages = [
  "Listening for user input...",
  "1. Sending audio to speech-to-text...",
  "2. Transcription ready.",
  "3. Forwarding the transcript to the language model...",
  "4. Generating the response...",
  "5. Sending the response to speech synthesis...",
  "6. Generating speech with Addis Voices 2...",
  "7. Delivering the completed audio...",
  "8. Playing the voice response.",
  "Voice loop complete — ready for the next request.",
];

// Milliseconds per step: tiles hold a little longer than wire hops.
const durations = [1500, 1100, 1300, 1100, 1500, 1100, 1300, 1100, 1600, 2800];

const VIEW: Rect = { x: -60, y: -64, w: 525, h: 318 };

const centerX = (index: number) => index * GAP;

function wireEnds(index: number): [Vec3, Vec3] {
  const x = centerX(index);
  // The far end stops where the next tile's top face starts to cover it.
  return [
    [x + HALF, 0, 1],
    [x + GAP - HALF - (TILE_H - 1), 0, 1],
  ];
}

function layerBox(vertices: Vec3[], pad = 14) {
  return bounds(vertices, pad);
}

/* ---------- tile objects (base drawing and lit overlay) ---------- */

function Microphone({ cx, lit = false }: { cx: number; lit?: boolean }) {
  return (
    <g>
      {lit ? null : (
        <>
          <IsoBox d={20} h={3} w={20} x={cx - 10} y={-10} z={TOP_Z} />
          <IsoBox d={4} h={18} w={4} x={cx - 2} y={-2} z={TOP_Z + 3} />
        </>
      )}
      <IsoBox d={16} h={14} lit={lit} w={16} x={cx - 8} y={-8} z={TOP_Z + 21} />
      {[onFront(cx - 8, 8, TOP_Z + 35), onSide(cx + 8, 8, TOP_Z + 35)].map((transform) => (
        <g className={lit ? "iso-lit" : "iso-detail"} key={transform} transform={transform}>
          {[4, 8, 12].map((u) => (
            <line key={u} x1={u} x2={u} y1={3} y2={11} />
          ))}
        </g>
      ))}
    </g>
  );
}

const screenLines = [
  [6, 7, 22],
  [6, 10.5, 15],
  [6, 14, 25],
] as const;

function Terminal({ cx }: { cx: number }) {
  return (
    <g>
      <IsoBox d={24} h={22} w={36} x={cx - 18} y={-12} z={TOP_Z} />
      <g transform={onFront(cx - 18, 12, TOP_Z + 22)}>
        <rect className="iso-recess" height={15} rx={1.5} width={30} x={3} y={3} />
        {screenLines.map(([x, y, length]) => (
          <line className="iso-detail" key={y} x1={x} x2={x + length} y1={y} y2={y} />
        ))}
      </g>
      <IsoBox d={9} h={2} w={32} x={cx - 16} y={15} z={TOP_Z} />
      <g className="iso-detail" transform={onTop(cx - 16, 15, TOP_Z + 2)}>
        {[4, 8, 12, 16, 20, 24, 28].map((u) => (
          <line key={u} x1={u} x2={u} y1={2.5} y2={6.5} />
        ))}
      </g>
    </g>
  );
}

const plateZ = [12, 21, 30];

function Plates({ cx, litFrom }: { cx: number; litFrom?: number }) {
  // `litFrom` draws plate N lit and the plates above it unlit, so a lit lower
  // plate never paints over a plate that sits in front of it.
  const start = litFrom ?? 0;
  return (
    <g>
      {plateZ.slice(start).map((z, offset) => (
        <IsoBox
          d={36}
          h={3}
          key={z}
          lit={litFrom !== undefined && offset === 0}
          w={36}
          x={cx - 18}
          y={-18}
          z={z}
        />
      ))}
      <g transform={onTop(cx - 18, -18, plateZ[2] + 3)}>
        <text
          className={litFrom === 2 ? "iso-print iso-print-lit" : "iso-print"}
          fontSize={6.5}
          x={4}
          y={32}
        >
          LLM
        </text>
      </g>
    </g>
  );
}

const barHeights = [6, 13, 20, 26, 18, 11, 5];

function Waveform({ cx, lit = false }: { cx: number; lit?: boolean }) {
  return (
    <g>
      {lit ? null : <IsoBox d={12} h={2} w={44} x={cx - 22} y={-6} z={TOP_Z} />}
      {barHeights.map((h, k) => (
        <IsoBox d={4} h={h} key={k} lit={lit} w={3.5} x={cx - 19 + k * 5.5} y={-2} z={TOP_Z + 2} />
      ))}
    </g>
  );
}

function Speaker({ cx, lit = false }: { cx: number; lit?: boolean }) {
  return (
    <g>
      {lit ? null : <IsoBox d={22} h={32} w={26} x={cx - 13} y={-11} z={TOP_Z} />}
      <g transform={onFront(cx - 13, 11, TOP_Z + 32)}>
        <circle className={lit ? "iso-lit-fill" : "iso-recess"} cx={13} cy={20} r={8} />
        <circle className={lit ? "iso-lit" : "iso-outline"} cx={13} cy={20} r={3.5} />
        <circle className={lit ? "iso-lit-fill" : "iso-recess"} cx={13} cy={7} r={3} />
      </g>
    </g>
  );
}

function Tile({ index }: { index: number }) {
  const cx = centerX(index);
  return (
    <g>
      <IsoBox d={HALF * 2} h={TILE_H} w={HALF * 2} x={cx - HALF} y={-HALF} z={0} />
      <g transform={onTop(cx - HALF, -HALF, TILE_H)}>
        <rect className="iso-detail" height={HALF * 2 - 8} rx={3} width={HALF * 2 - 8} x={4} y={4} />
      </g>
      <g transform={onFront(cx - HALF, HALF, TILE_H)}>
        <text className="iso-print" fontSize={5} x={4} y={6}>
          {String(index + 1).padStart(2, "0")}
        </text>
      </g>
    </g>
  );
}

function StageLabel({ index }: { index: number }) {
  const [x, y] = iso(centerX(index), 0, 0);
  return (
    <g>
      <text className="iso-index" x={x + 40} y={y - 44}>
        {String(index + 1).padStart(2, "0")}
      </text>
      <text className="iso-label" x={x + 40} y={y - 30}>
        {stages[index].label}
      </text>
    </g>
  );
}

function BaseDrawing() {
  return (
    <g>
      {connections.map((connection, index) => {
        const [from, to] = wireEnds(index);
        const [x1, y1] = iso(...from);
        const [x2, y2] = iso(...to);
        return (
          <g key={index}>
            <line className="iso-wire" x1={x1} x2={x2} y1={y1} y2={y2} />
            <g transform={onTop(from[0] + 6, 5, 0)}>
              <text className="iso-print" fontSize={6.5} x={0} y={5}>
                {connection.label.toUpperCase()}
              </text>
            </g>
          </g>
        );
      })}
      {stages.map((stage, index) => (
        <Tile index={index} key={stage.label} />
      ))}
      <Microphone cx={centerX(0)} />
      <Terminal cx={centerX(1)} />
      <g>
        {[-18, 18].flatMap((dx) =>
          [-18, 18].map((dy) => {
            const [x1, y1] = iso(centerX(2) + dx, dy, TOP_Z);
            const [x2, y2] = iso(centerX(2) + dx, dy, plateZ[2]);
            return (
              <line className="iso-detail iso-dashed" key={`${dx}${dy}`} x1={x1} x2={x2} y1={y1} y2={y2} />
            );
          }),
        )}
        <Plates cx={centerX(2)} />
      </g>
      <Waveform cx={centerX(3)} />
      <Speaker cx={centerX(4)} />
      {stages.map((stage, index) => (
        <StageLabel index={index} key={stage.label} />
      ))}
    </g>
  );
}

function haloAt(cx: number, z: number, rx: number) {
  const [x, y] = iso(cx, 0, z);
  return { cx: x, cy: y, rx, ry: rx * 0.7 };
}

export function VoiceLoopFlow() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { rootRef, paused, step } = useIsoLoop(durations, reducedMotion);
  const finalStep = statusMessages.length - 1;
  const reached = (activationStep: number) => step >= activationStep;

  const mic = centerX(0);
  const stt = centerX(1);
  const llm = centerX(2);
  const tts = centerX(3);
  const play = centerX(4);

  return (
    <div
      className="iso-diagram not-prose addis-offset-shell addis-panel my-10 w-full overflow-hidden"
      data-paused={paused}
      ref={rootRef}
    >
      <div className="flex items-center justify-between border-b border-fd-border px-5 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-foreground">
          Live request path
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground">
          {step === finalStep
            ? "Complete"
            : `Phase ${String(step + 1).padStart(2, "0")} / 09`}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="mx-auto w-full min-w-[20rem] max-w-[36rem] px-4 py-6 sm:px-8">
          <IsoStage
            base={<BaseDrawing />}
            label={`Voice pipeline: ${stages.map((stage) => stage.label).join(", then ")}.`}
            view={VIEW}
          >
            {connections.map((connection, index) => {
              const [from, to] = wireEnds(index);
              return (
                <IsoLayer
                  box={layerBox([from, to, [from[0] + 40, 12, 0]], 8)}
                  key={`wire-${index}`}
                  on={reached(connection.activationStep)}
                >
                  <GlowLine from={from} to={to} />
                  <g transform={onTop(from[0] + 6, 5, 0)}>
                    <text className="iso-print iso-print-lit" fontSize={6.5} x={0} y={5}>
                      {connection.label.toUpperCase()}
                    </text>
                  </g>
                </IsoLayer>
              );
            })}

            <IsoLayer
              box={layerBox(boxCorners(mic - 8, -8, TOP_Z + 21, 16, 16, 14), 26)}
              halo={haloAt(mic, TOP_Z + 28, 26)}
              on={reached(0)}
            >
              <Microphone cx={mic} lit />
            </IsoLayer>
            <IsoRings center={[mic, 0, TOP_Z]} on={step === 0} radius={24} />

            <IsoLayer
              box={layerBox(boxCorners(stt - 18, 12, TOP_Z, 36, 0.1, 22), 22)}
              halo={haloAt(stt, TOP_Z + 12, 30)}
              on={reached(2)}
            >
              <g transform={onFront(stt - 18, 12, TOP_Z + 22)}>
                <rect className="iso-lit-fill" height={15} rx={1.5} width={30} x={3} y={3} />
              </g>
            </IsoLayer>
            <IsoLayer
              box={layerBox(boxCorners(stt - 18, 12, TOP_Z, 36, 0.1, 22), 6)}
              delay={260}
              on={reached(2)}
            >
              <g className="iso-lit" transform={onFront(stt - 18, 12, TOP_Z + 22)}>
                {screenLines.map(([x, y, length]) => (
                  <line key={y} x1={x} x2={x + length} y1={y} y2={y} />
                ))}
              </g>
            </IsoLayer>

            {plateZ.map((z, index) => (
              <IsoLayer
                box={layerBox(boxCorners(llm - 18, -18, z, 36, 36, plateZ[2] + 3 - z), index === 0 ? 28 : 6)}
                delay={index * 160}
                halo={index === 0 ? haloAt(llm, 20, 40) : undefined}
                key={z}
                on={reached(4)}
              >
                <Plates cx={llm} litFrom={index} />
              </IsoLayer>
            ))}

            <IsoLayer
              box={layerBox(boxCorners(tts - 19, -2, TOP_Z + 2, 38, 4, 26), 26)}
              halo={haloAt(tts, TOP_Z + 12, 36)}
              on={reached(6)}
            >
              <Waveform cx={tts} lit />
            </IsoLayer>

            <IsoLayer
              box={layerBox(boxCorners(play - 13, 11, TOP_Z, 26, 0.1, 32), 24)}
              halo={haloAt(play, TOP_Z + 14, 30)}
              on={reached(8)}
            >
              <Speaker cx={play} lit />
            </IsoLayer>
            <IsoRings center={[play, 0, TOP_Z]} on={step >= 8} radius={26} />

            {connections.map((connection, index) => {
              const [from, to] = wireEnds(index);
              return (
                <IsoPulse
                  active={step === connection.activationStep}
                  from={from}
                  key={`pulse-${index}`}
                  paused={paused}
                  to={to}
                />
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
