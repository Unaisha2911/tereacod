"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { AlertCircle, Loader2, Send } from "lucide-react";
import {
  Checkbox,
  FormError,
  FormField,
  FormSuccess,
  Select,
  TextArea,
  TextInput,
} from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SUBJECTS = ["Order question", "Product question", "Safety report", "Privacy request", "Feedback", "Other"] as const;

/**
 * Support-ticket category derived from the chosen subject — keeps tickets
 * landing in the right queue server-side instead of defaulting to "General".
 * Keys must match the SUBJECTS option strings exactly; anything unmapped
 * falls back to "other".
 */
const CATEGORY_MAP: Record<string, "order" | "product" | "delivery" | "account" | "other"> = {
  "Order question": "order",
  "Product question": "product",
  "Safety report": "other",
  "Privacy request": "account",
  "Feedback": "other",
  "Other": "other",
};

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters)."),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  subject: z.string().min(1, "Choose a subject."),
  message: z.string().trim().min(20, "Your message needs at least 20 characters."),
  consent: z.boolean().refine((value) => value, {
    message: "We need your consent before we can accept a message.",
  }),
});

type FormValues = { name: string; email: string; subject: string; message: string; consent: boolean };
type FieldErrors = Partial<Record<keyof FormValues, string>>;
type SubmitState = "idle" | "submitting" | "success" | "error";

const INITIAL_VALUES: FormValues = { name: "", email: "", subject: "", message: "", consent: false };

export function ContactForm() {
  const { toast } = useToast();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>("idle");

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = enquirySchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setState("submitting");
    try {
      // Real submission: creates a support ticket + acknowledgement email
      // (job outbox). Rate-limited and captcha-ready server-side.
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          subject: values.subject,
          message: values.message,
          category: CATEGORY_MAP[values.subject] ?? "other",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { received?: boolean; message?: string };
        error?: { message?: string; fields?: Record<string, string> };
      };
      if (!response.ok || !body.data?.received) {
        if (body.error?.fields) {
          setErrors(body.error.fields as FieldErrors);
        }
        throw new Error(body.error?.message ?? "The message could not be sent.");
      }
      setState("success");
      toast({
        title: "Message received",
        description:
          body.data.message ??
          "Your message was received and a support ticket was created — we reply within two business days.",
      });
    } catch {
      setState("error");
    }
  }

  const describedBy = (field: keyof FormValues) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField label="Name" htmlFor="name" required error={errors.name}>
        <TextInput
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
        />
      </FormField>

      <FormField label="Email" htmlFor="email" required error={errors.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
        />
      </FormField>

      <FormField label="Subject" htmlFor="subject" required error={errors.subject}>
        <Select
          id="subject"
          name="subject"
          value={values.subject}
          onChange={(e) => set("subject", e.target.value)}
          invalid={Boolean(errors.subject)}
          aria-describedby={describedBy("subject")}
        >
          <option value="" disabled>
            Select a subject
          </option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Message"
        htmlFor="message"
        required
        error={errors.message}
        hint={errors.message ? undefined : "At least 20 characters. Include a batch code or order reference if relevant."}
      >
        <TextArea
          id="message"
          name="message"
          rows={5}
          placeholder="How can we help?"
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          invalid={Boolean(errors.message)}
          aria-describedby={describedBy("message")}
        />
      </FormField>

      {/* Privacy consent — required */}
      <div className="space-y-2">
        <Checkbox
          name="consent"
          checked={values.consent}
          onChange={(next) => set("consent", next)}
          label="I agree that my message may be processed to answer this enquiry."
        />
        <p className="text-[0.78rem] leading-relaxed text-muted-foreground">
          Read the{" "}
          <Link href="/legal/privacy" className="text-violet-soft underline-offset-4 hover:underline">
            Privacy Notice
          </Link>{" "}
          before consenting. <span className="text-error" aria-hidden="true">*</span>
          <span className="sr-only">Required.</span>
        </p>
        {errors.consent && (
          <p id="consent-error" role="alert" className="flex items-center gap-1.5 text-[0.78rem] text-error">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {errors.consent}
          </p>
        )}
      </div>

      {state === "success" && (
        <FormSuccess>
          Your message was received and a support ticket has been created. Our team replies within two business days,
          Sunday to Thursday.
        </FormSuccess>
      )}
      {state === "error" && (
        <FormError>The submission failed — your message was not sent. Please try again in a moment.</FormError>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Button
          type="submit"
          disabled={state === "submitting"}
          className="min-h-11 w-full rounded-full px-7 sm:w-auto"
        >
          {state === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden="true" />
              Send message
            </>
          )}
        </Button>
        <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
          Replies within two business days, Sunday to Thursday.
        </p>
      </div>
    </form>
  );
}
