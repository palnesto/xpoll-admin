import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const isComplete = progress === 100;

  return (
    <div className="relative w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
      {/* Background track */}
      <div className="absolute inset-0 bg-muted rounded-full" />

      {/* Progress indicator */}
      <div
        className={cn(
          "absolute h-full transition-all duration-300 ease-out rounded-full",
          isComplete ? "bg-primary" : "bg-primary/80",
          !isComplete && "animate-progress-stripes"
        )}
        style={{
          width: `${progress}%`,
          backgroundImage: !isComplete
            ? "linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)"
            : "none",
          backgroundSize: "1rem 1rem",
        }}
      />

      {/* Shine effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </div>
  );
};
