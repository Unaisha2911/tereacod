"use client";

import { cloneElement, forwardRef, isValidElement, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------- FormField --------------------------- */

/**
 * Merge an auto-computed aria-describedby with any incoming value from the
 * control's own props, de-duplicating ids while preserving order.
 */
function mergeDescribedBy(child: React.ReactNode, describedBy: string | undefined): React.ReactNode {
  if (!describedBy || !isValidElement(child)) return child;
  const element = child as React.ReactElement<{ "aria-describedby"?: string }>;
  const ids = [...(element.props["aria-describedby"]?.split(/\s+/) ?? []), ...describedBy.split(/\s+/)].filter(
    (id, index, all) => id.length > 0 && all.indexOf(id) === index
  );
  if (ids.length === 0) return child;
  return cloneElement(element, { "aria-describedby": ids.join(" ") });
}

/**
 * FormField — label + control + hint/error wiring. When a hint or error is
 * rendered, its id is attached to the control via aria-describedby
 * automatically (merged with any describedby the control already carries).
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const describedBy =
    [hint && !error ? `${htmlFor}-hint` : null, error ? `${htmlFor}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[0.82rem] font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-1 text-violet-soft" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>
      {mergeDescribedBy(children, describedBy)}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-[0.75rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-center gap-1.5 text-[0.78rem] text-error">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const baseInput =
  "h-11 w-full rounded-xl border border-line bg-foreground/[0.03] px-3.5 text-[0.9rem] text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-violet-glow/60 focus:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-error/60";

/* ----------------------------- TextInput --------------------------- */

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...props }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(baseInput, className)} {...props} />;
  }
);

/* ---------------------------- Textarea ----------------------------- */

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(baseInput, "h-auto min-h-28 resize-y py-3 leading-relaxed", className)}
        {...props}
      />
    );
  }
);

/* ----------------------------- Select ------------------------------ */

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} aria-invalid={invalid || undefined} className={cn(baseInput, "appearance-none pr-10 [&>option]:bg-popover [&>option]:text-foreground", className)} {...props}>
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  }
);

/* --------------------------- PasswordInput ------------------------- */

export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { invalid?: boolean }>(
  function PasswordInput({ className, invalid, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={visible ? "text" : "password"} aria-invalid={invalid || undefined} className={cn(baseInput, "pr-12", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);

/* ----------------------------- Checkbox ---------------------------- */

/**
 * Checkbox — custom control with a real accessible name: the visible label
 * element carries a generated id and the checkbox references it via
 * aria-labelledby (description via aria-describedby). The label stays
 * clickable and the invisible ::before halo lifts the touch target to ~40px
 * without changing the visual size.
 */
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
  name,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
}) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        name={name}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all before:absolute before:-inset-2.5 before:rounded-lg before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50",
          checked ? "border-violet-glow bg-violet-glow text-white" : "border-line-strong bg-foreground/[0.03] hover:border-violet-glow/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </button>
      <div>
        <label id={labelId} className="block cursor-pointer text-[0.88rem] font-medium text-foreground" onClick={() => !disabled && onChange(!checked)}>
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- RadioGroup -------------------------- */

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  label: string;
  options: RadioOption[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-[0.82rem] font-medium text-foreground">{label}</legend>
      <div role="radiogroup" aria-label={label} className="space-y-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                selected ? "border-violet-glow/50 bg-violet-glow/[0.07]" : "border-line bg-foreground/[0.02] hover:border-line-strong"
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-violet-glow" : "border-line-strong"
                )}
              >
                {selected && <span className="size-2 rounded-full bg-violet-glow" />}
              </span>
              <span>
                <span className="block text-[0.88rem] font-medium text-foreground">{opt.label}</span>
                {opt.description && <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">{opt.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* --------------------------- FormFeedback -------------------------- */

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/[0.07] px-4 py-3 text-[0.84rem] text-error">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function FormSuccess({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="status" aria-live="polite" className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/[0.07] px-4 py-3 text-[0.84rem] text-success">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
