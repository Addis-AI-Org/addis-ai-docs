"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { Lock, Server, Smartphone } from "lucide-react";

import { cn } from "../lib/cn";

const statusMessages = [
  "Waiting for a client request...",
  "1. Client sends the payload to your backend...",
  "2. Your backend validates the request...",
  "3. Your backend adds the API key and forwards the request...",
  "4. Addis AI processes the authenticated request...",
  "Request path complete — the response returns through your backend.",
];

function ArchitectureNode({
  activationStep,
  annotation,
  children,
  label,
  showLock = false,
  step,
}: {
  activationStep: number;
  annotation?: string;
  children: ReactNode;
  label: string;
  showLock?: boolean;
  step: number;
}) {
  const isReached = step >= activationStep;
  const isCurrent = step === activationStep;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="flex h-7 items-start justify-center">
        {annotation ? (
          <span
            className={cn(
              "whitespace-nowrap border bg-fd-background px-2 py-1 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.14em] transition-[transform,border-color,color,opacity] duration-500",
              isReached
                ? "translate-y-0 border-fd-primary/40 text-fd-primary opacity-100"
                : "translate-y-1 border-fd-border text-fd-muted-foreground opacity-0",
            )}
          >
            {annotation}
          </span>
        ) : null}
      </div>

      <div
        aria-current={isCurrent ? "step" : undefined}
        className={cn(
          "relative flex size-16 shrink-0 items-center justify-center border bg-fd-background text-fd-muted-foreground transition-[transform,border-color,background-color,color,opacity,box-shadow] duration-500 ease-out",
          isReached
            ? "border-fd-primary/70 text-fd-primary opacity-100"
            : "border-fd-border opacity-45",
          isCurrent &&
            "scale-105 border-fd-primary bg-fd-primary/10 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-fd-primary)_10%,transparent)]",
        )}
      >
        <div
          className={cn(
            "transition-transform duration-500 ease-out",
            isCurrent && "scale-110",
          )}
        >
          {children}
        </div>

        {showLock ? (
          <span
            className={cn(
              "absolute -right-2 -top-2 flex size-6 items-center justify-center border border-fd-border bg-fd-background transition-[border-color,color,opacity] duration-500",
              isReached
                ? "border-fd-primary/40 text-fd-primary opacity-100"
                : "text-fd-muted-foreground opacity-45",
            )}
          >
            <Lock aria-hidden="true" className="size-3" />
          </span>
        ) : null}

        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1 -left-1 size-2 border border-fd-background bg-fd-border transition-colors duration-500",
            isReached && "bg-fd-primary",
          )}
        />
      </div>

      <span
        className={cn(
          "mt-3 min-h-8 text-center text-xs font-semibold leading-4 transition-colors duration-500",
          isReached ? "text-fd-foreground" : "text-fd-muted-foreground",
        )}
      >
        {label}
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
    <div className="relative mt-7 flex h-16 min-w-0 items-center px-3">
      <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 overflow-visible bg-fd-border">
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
          "relative mx-auto whitespace-nowrap border bg-fd-background px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] transition-[transform,border-color,color,opacity] duration-500",
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

export function ArchitectureFlow() {
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
          Secure request path
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground">
          {step === statusMessages.length - 1
            ? "Complete"
            : `Phase ${String(step + 1).padStart(2, "0")} / 05`}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="mx-auto min-w-[42rem] px-8 py-9">
          <div className="grid grid-cols-[6rem_minmax(8rem,1fr)_6rem_minmax(8rem,1fr)_6rem] items-start">
            <ArchitectureNode activationStep={0} label="Client app" step={step}>
              <Smartphone aria-hidden="true" className="size-8" />
            </ArchitectureNode>

            <ConnectionLine
              activationStep={1}
              label="Sends data"
              step={step}
            />

            <ArchitectureNode
              activationStep={2}
              annotation="Secure zone"
              label="Your backend"
              showLock
              step={step}
            >
              <Server aria-hidden="true" className="size-8" />
            </ArchitectureNode>

            <ConnectionLine
              activationStep={3}
              label="+ API key"
              step={step}
            />

            <ArchitectureNode activationStep={4} label="Addis AI" step={step}>
              <Image
                alt="Addis AI"
                className={cn(
                  "size-8 object-contain transition-[filter,opacity] duration-500",
                  step >= 4 ? "opacity-100" : "grayscale opacity-45",
                )}
                height={32}
                src="/images/addis-logo.png"
                width={32}
              />
            </ArchitectureNode>
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
