"use client";

import { useEffect, useState } from "react";
import {
  AudioLines,
  Bot,
  FileText,
  Mic,
  Volume2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "../lib/cn";

type Stage = {
  label: string;
  activationStep: number;
  icon: LucideIcon;
};

const stages: Stage[] = [
  { label: "User speaks", activationStep: 0, icon: Mic },
  { label: "Transcribe", activationStep: 2, icon: FileText },
  { label: "Reasoning", activationStep: 4, icon: Bot },
  { label: "Synthesize", activationStep: 6, icon: AudioLines },
  { label: "Play", activationStep: 8, icon: Volume2 },
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

function StageNode({
  stage,
  step,
}: {
  stage: Stage;
  step: number;
}) {
  const Icon = stage.icon;
  const isReached = step >= stage.activationStep;
  const isCurrent = step === stage.activationStep;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div
        className={cn(
          "relative flex size-14 shrink-0 items-center justify-center border bg-fd-background text-fd-muted-foreground transition-[transform,border-color,background-color,color,opacity,box-shadow] duration-500 ease-out",
          isReached
            ? "border-fd-primary/70 text-fd-primary opacity-100"
            : "border-fd-border opacity-45",
          isCurrent &&
            "scale-105 border-fd-primary bg-fd-primary/10 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-fd-primary)_10%,transparent)]",
        )}
        aria-current={isCurrent ? "step" : undefined}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-6 transition-transform duration-500 ease-out",
            isCurrent && "scale-110",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-1 -top-1 size-2 border border-fd-background bg-fd-border transition-colors duration-500",
            isReached && "bg-fd-primary",
          )}
        />
      </div>

      <span
        className={cn(
          "mt-3 min-h-8 text-center text-[11px] font-semibold leading-4 transition-colors duration-500 sm:text-xs",
          isReached ? "text-fd-foreground" : "text-fd-muted-foreground",
        )}
      >
        {stage.label}
      </span>
    </div>
  );
}

function ConnectionLine({
  activationStep,
  label,
  step,
}: {
  activationStep: number;
  label: string;
  step: number;
}) {
  const isReached = step >= activationStep;
  const isCurrent = step === activationStep;

  return (
    <div className="relative flex h-14 min-w-0 items-center px-2">
      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 overflow-visible bg-fd-border">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 origin-left bg-fd-primary transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isReached ? "scale-x-100" : "scale-x-0",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 border border-fd-background bg-fd-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-fd-primary)_12%,transparent)] transition-[left,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isReached ? "left-full" : "left-0",
            isCurrent ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      <span
        className={cn(
          "relative mx-auto whitespace-nowrap border bg-fd-background px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] transition-[transform,border-color,color,opacity] duration-500",
          isReached
            ? "translate-y-0 border-fd-primary/40 text-fd-primary opacity-100"
            : "translate-y-1 border-fd-border text-fd-muted-foreground opacity-0",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function VoiceLoopFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(statusMessages.length - 1);
      return;
    }

    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % statusMessages.length);
    }, 1150);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="not-prose addis-offset-shell addis-panel my-10 w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-fd-border px-5 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-primary">
          Live request path
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground">
          {step === statusMessages.length - 1
            ? "Complete"
            : `Phase ${String(step + 1).padStart(2, "0")} / 09`}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="mx-auto min-w-[48rem] px-7 py-9">
          <div className="grid grid-cols-[5rem_minmax(4.5rem,1fr)_5rem_minmax(4.5rem,1fr)_5rem_minmax(4.5rem,1fr)_5rem_minmax(4.5rem,1fr)_5rem] items-start">
            {stages.map((stage, index) => (
              <div className="contents" key={stage.label}>
                <StageNode stage={stage} step={step} />
                {connections[index] ? (
                  <ConnectionLine
                    activationStep={connections[index].activationStep}
                    label={connections[index].label}
                    step={step}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-14 items-center gap-3 border-t border-fd-border px-5 py-3"
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 bg-fd-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-fd-primary)_10%,transparent)]"
        />
        <span className="text-sm font-medium text-fd-muted-foreground">
          {statusMessages[step]}
        </span>
      </div>
    </div>
  );
}
