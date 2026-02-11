// src/components/commons/form/NumberField.tsx
import { useEffect, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getZodFieldMeta } from "./utils/zodFieldMeta";

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  schema: z.ZodObject<any>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  helperText?: string;
  decimalScale?: number;
  showError?: boolean;
  className?: string;
};

function isValidNumericInput(raw: string, decimalScale: number) {
  if (!/^-?\d*\.?\d*$/.test(raw)) return false;

  if (decimalScale <= 0) return /^-?\d*$/.test(raw);

  const parts = raw.split(".");
  if (parts.length > 2) return false;
  if (parts[1] && parts[1].length > decimalScale) return false;

  return true;
}

export function NumberField<T extends FieldValues>({
  form,
  schema,
  name,
  label,
  placeholder,
  helperText,
  decimalScale = 0,
  showError,
  className,
}: Props<T>) {
  const { control, setValue, getValues, formState } = form;
  const meta = getZodFieldMeta(schema, String(name));
  const err = (formState.errors as any)?.[name]?.message as string | undefined;
  const isRequired = !!label && !meta.optional;

  const [text, setText] = useState<string>("");
  const watchedValue = useWatch({ control, name });

  useEffect(() => {
    if (meta.base !== "number") return;
    const v = getValues(name);
    if (!meta.optional && v === undefined) {
      setValue(name, 0 as any, { shouldDirty: false, shouldTouch: false });
    }
  }, [meta.base, meta.optional, getValues, name, setValue]);

  useEffect(() => {
    const v = watchedValue as any;

    if (v === undefined || v === null) {
      if (text === "" || text === "-" || text === "." || text === "-.")
        setText("");
      return;
    }

    const next = String(v);
    if (next !== text) setText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue]);

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
        render={({ field }) => (
          <>
            <input
              inputMode={decimalScale > 0 ? "decimal" : "numeric"}
              value={text}
              placeholder={placeholder}
              onBlur={(e) => {
                field.onBlur();
                const raw = e.target.value.trim();

                if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
                  if (meta.optional) {
                    field.onChange(undefined);
                    setText("");
                  } else {
                    field.onChange(0);
                    setText("0");
                  }
                  return;
                }

                const n = Number(raw);
                if (!Number.isFinite(n)) {
                  if (meta.optional) {
                    field.onChange(undefined);
                    setText("");
                  } else {
                    field.onChange(0);
                    setText("0");
                  }
                  return;
                }

                field.onChange(n);
                setText(String(n));
              }}
              onChange={(e) => {
                const raw = e.target.value;

                if (raw === "") {
                  setText("");
                  if (meta.optional) field.onChange(undefined);
                  else field.onChange(0);
                  return;
                }

                if (!isValidNumericInput(raw, decimalScale)) return;

                setText(raw);

                if (
                  raw === "-" ||
                  raw === "." ||
                  raw === "-." ||
                  raw.endsWith(".")
                )
                  return;

                const n = Number(raw);
                if (Number.isFinite(n)) field.onChange(n);
              }}
              className={cn(
                "w-full h-11 rounded-2xl border px-3 text-base font-light tracking-wide bg-transparent outline-none focus:ring-2",
                err
                  ? "border-red-500 focus:ring-red-200"
                  : "border-border focus:ring-muted",
              )}
            />

            {helperText ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {helperText}
              </div>
            ) : null}

            {showError && err ? (
              <div className="text-xs text-destructive">{err}</div>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
