"use client";

import { useRef, useState, type FormEvent } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { ApiError, api } from "@/lib/api";

type FeedbackCategory = "bug" | "suggestion" | "other";
type FeedbackPayload = {
  submission_id: string;
  category: FeedbackCategory;
  message: string;
  contact_name?: string;
  contact_email?: string;
};

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;

function createSubmissionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "feedback-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function feedbackError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "FEEDBACK_DELIVERY_FAILED" || cause.status === 503) {
      return "RetailOS could not deliver your feedback right now. Your message is still here. Retry this same submission later.";
    }
    if (cause.code === "DUPLICATE_SUBMISSION") {
      return "This submission reference is already linked to different feedback. Your message has not been confirmed. Do not keep retrying this reference.";
    }
    if (cause.status === 400 || cause.status === 422) {
      return "The server rejected the feedback details. Check the category, message length, and contact details, then correct the form.";
    }
    if (cause.status === 401 || cause.status === 403) {
      return "Your session could not be verified. Sign in again before sending feedback.";
    }
    if (cause.status >= 500) {
      return "The server encountered a problem. The submission result may be uncertain, so retry only this same feedback with its existing reference.";
    }
    return "Feedback could not be submitted: " + cause.message;
  }
  return "The connection was interrupted before RetailOS confirmed the submission. Retry the same feedback; do not create a second submission.";
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("other");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState<FeedbackPayload | null>(null);
  const submissionId = useRef("");

  function getSubmissionId() {
    if (!submissionId.current) submissionId.current = createSubmissionId();
    return submissionId.current;
  }

  async function send(payload: FeedbackPayload) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await api<{ message?: string }>("/feedback", {
        method: "POST",
        json: payload,
      });
      setSuccess("Feedback submitted successfully. RetailOS has confirmed that it was accepted for delivery.");
      setCategory("other");
      setMessage("");
      setContactName("");
      setContactEmail("");
      setAttempt(null);
      submissionId.current = "";
      void result;
    } catch (cause) {
      setError(feedbackError(cause));
      if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.code !== "DUPLICATE_SUBMISSION") {
        // A definite client-side rejection was not accepted. Let the user correct
        // the form and use a fresh identifier for the corrected payload.
        setAttempt(null);
        submissionId.current = "";
      } else {
        // Preserve the exact payload and identifier when the outcome may be
        // uncertain. Retry must not accidentally create a second feedback item.
        setAttempt(payload);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || attempt) return;

    const trimmedMessage = message.trim();
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must contain between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`);
      setSuccess("");
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address or leave the contact email blank.");
      setSuccess("");
      return;
    }

    const payload: FeedbackPayload = {
      submission_id: getSubmissionId(),
      category,
      message: trimmedMessage,
      ...(trimmedName ? { contact_name: trimmedName } : {}),
      ...(trimmedEmail ? { contact_email: trimmedEmail } : {}),
    };
    await send(payload);
  }

  function retry() {
    if (!attempt || submitting) return;
    void send(attempt);
  }

  const lockedForRecovery = Boolean(attempt);

  return (
    <DashboardShell title="Feedback">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#151515] p-5 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold">Help improve TX RetailOS</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Report a problem, suggest an improvement, or share general feedback. Do not include passwords,
            PINs, payment-card details, bank credentials, session tokens, or other sensitive account information.
          </p>
        </div>

        {success && <div role="status" className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">{success}</div>}
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <fieldset disabled={submitting || lockedForRecovery} className="space-y-5 disabled:opacity-75">
            <label className="flex flex-col gap-2 text-sm text-white/75">
              Feedback category <span className="text-orange-300" aria-hidden="true">*</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} required className="field">
                <option value="bug">Bug Report</option>
                <option value="suggestion">Feature Request</option>
                <option value="other">General Feedback</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-white/75">
              Message <span className="text-orange-300" aria-hidden="true">*</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                minLength={MIN_MESSAGE_LENGTH}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={7}
                className="field resize-y"
                placeholder="Describe what happened, what you expected, or what would make RetailOS better."
                aria-describedby="feedback-message-help"
              />
              <span id="feedback-message-help" className="text-xs text-white/50">
                {message.trim().length}/{MAX_MESSAGE_LENGTH} characters. Enter at least {MIN_MESSAGE_LENGTH}.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-white/75">
                Contact name <span className="text-white/45">(optional)</span>
                <input value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={100} className="field" autoComplete="name" placeholder="How should we address you?" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/75">
                Contact email <span className="text-white/45">(optional)</span>
                <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} type="email" maxLength={254} className="field" autoComplete="email" placeholder="you@example.com" />
              </label>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            {lockedForRecovery ? (
              <button type="button" onClick={retry} disabled={submitting} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Retrying submission…" : "Retry same submission"}
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Submitting feedback…" : "Submit feedback"}
              </button>
            )}
            {submitting && <span role="status" className="text-sm text-white/60">Sending your feedback. Please wait.</span>}
          </div>
          {lockedForRecovery && <p className="text-xs leading-5 text-white/50">The form is locked so a retry uses the exact same message and submission reference. This prevents accidental duplicate submissions while the previous result is uncertain.</p>}
        </form>
      </section>
    </DashboardShell>
  );
}
