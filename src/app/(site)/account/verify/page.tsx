import type { Metadata } from "next";
import { FileCheck2, Hourglass, IdCard, ScanFace, UploadCloud } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { StatusBadge } from "@/components/shared/status-badge";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Verify your identity",
  description: "Age and identity verification template — the flow ships with the approved identity provider integration.",
};

const STEPS = [
  {
    id: "step-1",
    title: "Confirm identity",
    body: "Your legal name and date of birth are checked against the document you provide.",
    icon: IdCard,
  },
  {
    id: "step-2",
    title: "Document scan",
    body: "Upload an Emirates ID or passport, then complete a short liveness check. The verification provider extracts and validates the document.",
    icon: ScanFace,
  },
  {
    id: "step-3",
    title: "Review",
    body: "A provider callback confirms the result before verification is recorded on the account.",
    icon: FileCheck2,
  },
];

export default function VerifyPage() {
  return (
    <AccountPage title="Verify your identity" layout="center" centerWidth="lg">
      <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-foreground/[0.04] text-violet-soft">
            <ScanFace className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-h2 font-bold text-foreground">Verify your identity</h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            UAE regulation requires age and identity verification before vapor products can be sold. This screen is a
            template: the real flow runs through an approved identity provider.
          </p>
        </div>

        {/* Steps */}
        <ol className="mt-8 space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className="flex items-start gap-4 rounded-2xl border border-line bg-foreground/[0.02] p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-[0.95rem] font-semibold text-foreground">
                      {index + 1}. {step.title}
                    </h2>
                    <StatusBadge tone="warning" icon={Hourglass}>
                      Pending integration
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Disabled upload dropzone */}
        <div
          aria-disabled="true"
          className="mt-6 flex cursor-not-allowed flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-foreground/[0.02] px-6 py-10 text-center"
        >
          <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">ID document upload</p>
          <p className="max-w-xs text-[0.8rem] leading-relaxed text-muted-foreground">
            Emirates ID or passport. Drag-and-drop and camera capture activate once the verification provider is connected.
          </p>
          <StatusBadge tone="warning" icon={Hourglass}>
            Provider integration required
          </StatusBadge>
        </div>

        <p className="mt-6 text-center text-[0.78rem] leading-relaxed text-muted-foreground">
          Nothing is uploaded or verified here — this template never fakes a successful verification.
        </p>
      </div>
    </AccountPage>
  );
}
