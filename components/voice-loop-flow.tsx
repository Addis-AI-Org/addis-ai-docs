"use client";

import { useState, useEffect } from "react";
import { Mic, FileText, Bot, AudioLines, Volume2 } from "lucide-react";
import { cn } from "../lib/cn";

export function VoiceLoopFlow() {
  const [step, setStep] = useState(0);

  // Cycle through 5 steps (0 to 5, then reset)
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 6); 
    }, 1500); 

    return () => clearInterval(timer);
  }, []);

  // Styles
  const nodeBaseClass = "w-12 h-12 md:w-14 md:h-14 border flex items-center justify-center transition-all duration-500 z-10 bg-fd-background shrink-0";
  const activeNodeClass = "border-blue-500 shadow-blue-500/20 scale-110";
  const inactiveNodeClass = "border-fd-border text-fd-muted-foreground opacity-50 grayscale";
  const labelClass = "text-[10px] md:text-xs font-bold text-center mt-2 transition-opacity absolute top-full w-24";
  
  // Connection Line Logic
  const ConnectionLine = ({ active, label }: { active: boolean, label: string }) => (
    <div className="flex-1 relative mx-1 md:mx-2 h-10 flex items-center justify-center min-w-[20px]">
      <div className="absolute inset-x-0 h-px bg-fd-border overflow-hidden">
         <div className={cn(
          "absolute inset-0 bg-blue-500 transition-transform duration-1000 ease-in-out origin-left",
          active ? "scale-x-100" : "scale-x-0"
        )} />
      </div>
      <div className={cn(
        "absolute -top-3 bg-fd-background border border-blue-200 dark:border-blue-900 text-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-300 transform",
        active ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
      )}>
        {label}
      </div>
    </div>
  );

  return (
    <div className="addis-offset-shell addis-panel w-full my-10 p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Wrapper for horizontal scrolling on very small mobile screens if needed */}
      <div className="flex flex-row items-center justify-between w-full max-w-4xl relative">
        
        {/* NODE 1: USER */}
        <div className="flex flex-col items-center relative group">
          <div className={cn(nodeBaseClass, step >= 0 ? activeNodeClass : inactiveNodeClass)}>
            <Mic className={cn("w-6 h-6", step >= 0 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn(labelClass, step >= 0 ? "opacity-100" : "opacity-50")}>User Speaks</div>
        </div>

        <ConnectionLine active={step >= 1} label="Audio" />

        {/* NODE 2: STT */}
        <div className="flex flex-col items-center relative group">
          <div className={cn(nodeBaseClass, step >= 1 ? activeNodeClass : inactiveNodeClass)}>
            <FileText className={cn("w-6 h-6", step >= 1 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn(labelClass, step >= 1 ? "opacity-100" : "opacity-50")}>Transcribe</div>
        </div>

        <ConnectionLine active={step >= 2} label="Text" />

        {/* NODE 3: LLM */}
        <div className="flex flex-col items-center relative group">
          <div className={cn(nodeBaseClass, step >= 2 ? activeNodeClass : inactiveNodeClass)}>
            <Bot className={cn("w-6 h-6", step >= 2 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn(labelClass, step >= 2 ? "opacity-100" : "opacity-50")}>Reasoning</div>
        </div>

        <ConnectionLine active={step >= 3} label="Text" />

        {/* NODE 4: TTS */}
        <div className="flex flex-col items-center relative group">
          <div className={cn(nodeBaseClass, step >= 3 ? activeNodeClass : inactiveNodeClass)}>
            <AudioLines className={cn("w-6 h-6", step >= 3 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn(labelClass, step >= 3 ? "opacity-100" : "opacity-50")}>Synthesize</div>
        </div>

        <ConnectionLine active={step >= 4} label="Audio" />

        {/* NODE 5: PLAY */}
        <div className="flex flex-col items-center relative group">
          <div className={cn(nodeBaseClass, step >= 4 ? activeNodeClass : inactiveNodeClass)}>
            <Volume2 className={cn("w-6 h-6", step >= 4 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn(labelClass, step >= 4 ? "opacity-100" : "opacity-50")}>Play</div>
        </div>

      </div>

      {/* spacer for labels */}
      <div className="h-8 w-full" />

      {/* STATUS TEXT */}
      <div className="mt-6 h-6 text-sm text-fd-muted-foreground font-medium transition-all duration-300 text-center">
        {step === 0 && "Waiting for input..."}
        {step === 1 && "1. Sending audio to STT..."}
        {step === 2 && "2. LLM generates answer..."}
        {step === 3 && "3. Generating speech (TTS)..."}
        {step >= 4 && "4. Playing response!"}
      </div>

    </div>
  );
}
