"use client";

import { useState, useEffect } from "react";
import { Smartphone, Server, Lock } from "lucide-react";
import { cn } from "../lib/cn";// Ensure you have a utils file, or remove cn and use template literals


export function ArchitectureFlow() {
  const [step, setStep] = useState(0);

  // Cycle through the animation steps
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 5); // 5 steps total before reset
    }, 1500); // Change step every 1.5 seconds

    return () => clearInterval(timer);
  }, []);

  // Common class for the node container to ensure perfect symmetry
  const nodeBaseClass = "w-16 h-16 border flex items-center justify-center transition-all duration-500 z-10 bg-fd-background";
  
  // Active state style (Blue border, Blue shadow)
  const activeNodeClass = "border-blue-500 shadow-blue-500/20 scale-110";

  const addisactiveNodeClass = "border-blue-500 shadow-blue-500/20 scale-110 bg-blue-500 border-blue-600";
  
  // Inactive state style
  const inactiveNodeClass = "border-fd-border text-fd-muted-foreground opacity-50 grayscale";

  return (
    <div className="addis-offset-shell addis-panel w-full my-10 p-8 flex flex-col items-center justify-center overflow-hidden">
      
      <div className="flex flex-row items-center justify-between w-full max-w-3xl gap-2 md:gap-4 relative">
        
        {/* ================= NODE 1: CLIENT ================= */}
        <div className="flex flex-col items-center gap-3 relative">
          <div className={cn(nodeBaseClass, step >= 0 ? activeNodeClass : inactiveNodeClass)}>
            <Smartphone className={cn("w-8 h-8", step >= 0 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn("text-xs font-bold text-center transition-opacity", step >= 0 ? "opacity-100" : "opacity-50")}>
            Client App
          </div>
        </div>

        {/* ================= CONNECTION 1 ================= */}
        <div className="flex-1 relative mx-2 h-10 flex items-center justify-center">
          {/* The Line Background */}
          <div className="absolute inset-x-0 h-px bg-fd-border overflow-hidden">
             {/* The Animated Bar */}
             <div className={cn(
              "absolute inset-0 bg-blue-400 transition-transform duration-1000 ease-in-out origin-left",
              step >= 1 ? "scale-x-100" : "scale-x-0"
            )} />
          </div>

          {/* The Pop-up Text (Now floating above, not clipped) */}
          <div className={cn(
            "absolute bg-fd-background border border-blue-200 dark:border-blue-900 text-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform",
            step >= 1 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
          )}>
            Sends Data
          </div>
        </div>

        {/* ================= NODE 2: SERVER ================= */}
        <div className="flex flex-col items-center gap-3 relative">
          <div className={cn(nodeBaseClass, step >= 2 ? activeNodeClass : inactiveNodeClass, "relative")}>
            {/* Badge pinned to the backend node to avoid overflow/clipping */}
            <div className={cn(
              "absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out",
              step >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}>
              <span className="whitespace-nowrap px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-500 border border-blue-500/40 bg-fd-background">
                Secure Zone
              </span>
            </div>

            {/* Lock Icon Overlay */}
            <div className="absolute -right-2 -top-2 bg-fd-background p-1 border border-fd-border z-20">
               <Lock className={cn("w-3 h-3", step >= 2 ? "text-blue-600" : "text-fd-muted-foreground")} />
            </div>
            <Server className={cn("w-8 h-8", step >= 2 ? "text-blue-500" : "text-fd-muted-foreground")} />
          </div>
          <div className={cn("text-xs font-bold text-center transition-opacity", step >= 2 ? "opacity-100" : "opacity-50")}>
            Your Backend
          </div>
        </div>

        {/* ================= CONNECTION 2 ================= */}
        <div className="flex-1 relative mx-2 h-10 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-fd-border overflow-hidden">
             <div className={cn(
              "absolute inset-0 bg-blue-500 transition-transform duration-1000 ease-in-out origin-left",
              step >= 3 ? "scale-x-100" : "scale-x-0"
            )} />
          </div>

          <div className={cn(
            "absolute bg-fd-background border border-blue-200 dark:border-blue-900 text-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform",
            step >= 3 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
          )}>
            + Adds API Key
          </div>
        </div>

        {/* ================= NODE 3: ADDIS AI ================= */}
        <div className="flex flex-col items-center gap-3 relative">
          <div className={cn(nodeBaseClass, step >= 4 ? addisactiveNodeClass : inactiveNodeClass)}>
             {/* Logo Image - Perfectly centered and sized */}
             <img 
              src="/images/addis-logo.png" 
              alt="Addis AI" 
              className={cn(
                "w-8 h-8 object-contain transition-all duration-500", 
                step >= 4 ? "opacity-100 filter-none" : "opacity-40 grayscale"
              )}
            />
          </div>
          <div className={cn("text-xs font-bold text-center transition-opacity", step >= 4 ? "opacity-100" : "opacity-50")}>
            Addis AI
          </div>
        </div>

      </div>

      {/* --- BOTTOM STATUS TEXT --- */}
      <div className="mt-10 h-6 text-sm text-fd-muted-foreground font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
        {step === 0 && "Waiting for user input..."}
        {step === 1 && "1. Client sends payload to your server..."}
        {step === 2 && "2. Server validates request..."}
        {step === 3 && "3. Server injects Secret Key & forwards..."}
        {step >= 4 && "4. Addis AI processes & returns data!"}
      </div>

    </div>
  );
}
