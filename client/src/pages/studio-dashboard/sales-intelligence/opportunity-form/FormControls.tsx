import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OPPORTUNITY_FORM_INPUT_CLASS, OPPORTUNITY_FORM_TEXTAREA_CLASS } from "../opportunityFormTypes";

export function FormFieldLabel({ children, help }: { children: ReactNode; help?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{children}</p>
      {help}
    </div>
  );
}

export function FormTextInput({
  label,
  help,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  id,
}: {
  label: string;
  help?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string | null;
  id?: string;
}) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div>
      <FormFieldLabel help={help}>{label}</FormFieldLabel>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={cn(
          OPPORTUNITY_FORM_INPUT_CLASS,
          hasError && "border-red-500/45 focus:border-red-400/60"
        )}
      />
      {hasError ? (
        <p id={errorId} className="mt-1.5 text-[10px] leading-snug text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormTextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  error?: string | null;
}) {
  const hasError = Boolean(error);
  return (
    <div>
      <FormFieldLabel>{label}</FormFieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={hasError}
        className={cn(
          OPPORTUNITY_FORM_TEXTAREA_CLASS,
          hasError && "border-red-500/45 focus:border-red-400/60"
        )}
      />
      {hasError ? (
        <p className="mt-1.5 text-[10px] leading-snug text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
