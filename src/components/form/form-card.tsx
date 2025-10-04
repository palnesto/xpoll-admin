import * as React from "react";
import { cn } from "@/lib/utils";

interface FormCardAction {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

interface FormCardProps {
  title?: string;
  subtitle?: string;
  actions?: FormCardAction[]; // array of buttons/icons
  children: React.ReactNode;
  className?: string;
}

export function FormCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: FormCardProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {(title || subtitle || (actions && actions.length > 0)) && (
        <div className="flex items-center justify-between px-2">
          {/* left side: title */}
          {title && <p className="text-lg text-zinc-500">{title}</p>}

          {/* right side: subtitle + actions */}
          <div className="flex items-center gap-3">
            {subtitle && (
              <span className="text-sm text-zinc-400">{subtitle}</span>
            )}
            {actions && actions.length > 0 && (
              <div className="flex items-center gap-2">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    aria-label={action.ariaLabel}
                    className={cn(
                      "rounded-md p-1 text-zinc-400 transition-colors",
                      "hover:text-zinc-600 dark:hover:text-zinc-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* content */}
      <div className="space-y-6 rounded-2xl bg-sidebar p-4">{children}</div>
    </div>
  );
}
