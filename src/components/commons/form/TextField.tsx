// src/components/commons/form/TextField.tsx
import { useEffect } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getZodFieldMeta, getZodStringMax } from "./utils/zodFieldMeta";

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  schema: z.ZodObject<any>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  helperText?: string;
  showError?: boolean;
  showCounter?: boolean;
  className?: string;
};

export function TextField<T extends FieldValues>({
  form,
  schema,
  name,
  label,
  placeholder,
  helperText,
  showError,
  showCounter,
  className,
}: Props<T>) {
  const { control, setValue, getValues, formState } = form;

  const meta = getZodFieldMeta(schema, String(name));
  const maxLen = getZodStringMax(schema, String(name));
  const isRequired = !!label && !meta.optional;

  useEffect(() => {
    if (meta.base !== "string") return;
    const v = getValues(name);
    if (!meta.optional && v === undefined) {
      setValue(name, "" as any, { shouldDirty: false, shouldTouch: false });
    }
  }, [meta.base, meta.optional, getValues, name, setValue]);

  const err = (formState.errors as any)?.[name]?.message as string | undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label className="text-sm font-normal tracking-wide">
          {label}
          {isRequired ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = field.value ?? "";
          const len = String(value).length;

          return (
            <>
              <input
                value={value}
                placeholder={placeholder}
                onBlur={field.onBlur}
                onChange={(e) => {
                  const raw = e.target.value;

                  // optional string: empty => undefined (later normalized to null on submit)
                  if (
                    meta.base === "string" &&
                    meta.optional &&
                    raw.trim() === ""
                  ) {
                    field.onChange(undefined);
                    return;
                  }

                  field.onChange(raw);
                }}
                className={cn(
                  "w-full h-11 rounded-2xl border px-3 text-base font-light tracking-wide bg-transparent outline-none focus:ring-2",
                  err
                    ? "border-red-500 focus:ring-red-200"
                    : "border-border focus:ring-muted",
                )}
              />

              {showCounter || helperText ? (
                <div className="mt-1 flex items-start justify-between gap-3">
                  {helperText ? (
                    <div className="text-xs text-muted-foreground">
                      {helperText}
                    </div>
                  ) : (
                    <div />
                  )}

                  {showCounter ? (
                    <div className="text-xs text-muted-foreground">
                      {maxLen ? `${len}/${maxLen}` : len}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showError && err ? (
                <div className="text-xs text-destructive">{err}</div>
              ) : null}
            </>
          );
        }}
      />
    </div>
  );
}
