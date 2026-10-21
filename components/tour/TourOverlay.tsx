"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useTour } from "@/components/tour/TourProvider";
import { isRectVisible, placePopover, progressLabel } from "@/lib/tour-core.mjs";
import type { PopoverPlacement, Rect } from "@/lib/tour-core.mjs";

const SPOTLIGHT_PADDING = 6;
/** How long to wait for a target to appear (data may still be loading) before giving up. */
const TARGET_TIMEOUT_MS = 3000;
const DEFAULT_POPOVER = { width: 360, height: 240 };

type Layout = { rect: Rect | null; width: number; height: number; missing: boolean };

function sameLayout(a: Layout, b: Layout) {
  const r1 = a.rect;
  const r2 = b.rect;
  const sameRect =
    (r1 === null && r2 === null) ||
    (r1 !== null && r2 !== null && r1.top === r2.top && r1.left === r2.left && r1.width === r2.width && r1.height === r2.height);
  return sameRect && a.width === b.width && a.height === b.height && a.missing === b.missing;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function TourOverlay() {
  const tour = useTour();
  const { state, step, chapter } = tour;
  const running = state.status === "running" && step !== null && chapter !== null;
  const stepKey = running ? `${state.chapterId}:${state.stepIndex}` : null;

  if (state.status === "paused" && step && chapter) return <PausedPill />;
  if (!running || !step || !chapter || stepKey === null) return null;
  return <ActiveStep key={stepKey} />;
}

function PausedPill() {
  const { chapter, state, resume, exit } = useTour();
  return (
    <div
      role="region"
      aria-label="Tour paused"
      className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-3 rounded-2xl border border-orange-500/40 bg-[#151515] px-4 py-3 text-sm shadow-xl"
    >
      <span className="text-white/85">
        Tour paused · {chapter?.title} · {progressLabel(state.chapterId, state.stepIndex)}
      </span>
      <button type="button" onClick={resume} className="rounded-lg bg-orange-500 px-3 py-1.5 font-semibold text-black">
        Resume
      </button>
      <button type="button" onClick={exit} className="rounded-lg bg-white/10 px-3 py-1.5">
        Exit tour
      </button>
    </div>
  );
}

function ActiveStep() {
  const tour = useTour();
  const { state, step, chapter, actionDone, markActionDone, next, back, skipStep, exit, pause } = tour;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ rect: null, width: 0, height: 0, missing: false });
  const [popoverSize, setPopoverSize] = useState(DEFAULT_POPOVER);

  const target = step?.target ?? "";
  const total = chapter?.steps.length ?? 0;
  const isLast = state.stepIndex === total - 1;
  const label = progressLabel(state.chapterId, state.stepIndex);
  const targetMissing = layout.missing;
  const needsAction = Boolean(step?.action) && !actionDone && !targetMissing;

  // Follow the target: waits for it to appear, scrolls it into view once, and
  // tracks it through scrolling, resizing and layout changes (e.g. the mobile menu opening).
  useEffect(() => {
    if (!target) return;
    const selector = `[data-tour="${target}"]`;
    const startedAt = performance.now();
    let frame = 0;
    let scrolledFor: Element | null = null;
    let current: Layout = { rect: null, width: window.innerWidth, height: window.innerHeight, missing: false };

    const tick = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      const visible = Boolean(box) && isRectVisible(box);
      let next: Layout;

      if (element && box && visible) {
        const isSheet = vw < 640;
        const bottomLimit = isSheet ? vh - 280 : vh - 16;
        const topLimit = isSheet ? 72 : 16;
        if (scrolledFor !== element) {
          scrolledFor = element;
          const offscreen = box.top < topLimit || box.top + Math.min(box.height, 120) > bottomLimit;
          if (offscreen) {
            const desired = isSheet ? topLimit + 8 : Math.max(topLimit, (vh - Math.min(box.height, vh * 0.6)) / 2);
            window.scrollBy({ top: box.top - desired, behavior: prefersReducedMotion() ? "auto" : "smooth" });
          }
        }
        next = {
          rect: {
            top: box.top - SPOTLIGHT_PADDING,
            left: box.left - SPOTLIGHT_PADDING,
            width: box.width + SPOTLIGHT_PADDING * 2,
            height: box.height + SPOTLIGHT_PADDING * 2,
          },
          width: vw,
          height: vh,
          missing: false,
        };
      } else {
        next = { rect: null, width: vw, height: vh, missing: performance.now() - startedAt > TARGET_TIMEOUT_MS };
      }

      if (!sameLayout(current, next)) {
        current = next;
        setLayout(next);
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  // Verify the user's real action instead of assuming it happened.
  const action = step?.action;
  useEffect(() => {
    if (!action || actionDone) return;
    const selector = action.selector ?? `[data-tour="${target}"]`;
    const eventName = action.type === "click" ? "click" : "input";
    const handler = (event: Event) => {
      const el = event.target instanceof Element ? event.target.closest(selector) : null;
      if (!el) return;
      if (action.type === "input" && !(el as HTMLInputElement).value) return;
      markActionDone();
    };
    document.addEventListener(eventName, handler, true);
    return () => document.removeEventListener(eventName, handler, true);
  }, [action, actionDone, target, markActionDone]);

  // Move focus into the card for keyboard and screen-reader users on every step.
  useEffect(() => {
    popoverRef.current?.focus({ preventScroll: true });
  }, []);

  // Track the card's real size so placement never overlaps the target.
  useEffect(() => {
    const node = popoverRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setPopoverSize((prev) =>
        prev.width === node.offsetWidth && prev.height === node.offsetHeight
          ? prev
          : { width: node.offsetWidth, height: node.offsetHeight },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [exit]);

  if (!step || !chapter) return null;

  const viewport = { width: layout.width || window.innerWidth, height: layout.height || window.innerHeight };
  const placed: PopoverPlacement = placePopover({ rect: layout.rect, popover: popoverSize, viewport });
  const canAdvance = !needsAction;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const el = event.target as HTMLElement;
    if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") return;
    if (event.key === "ArrowRight" && canAdvance) {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft" && state.stepIndex > 0) {
      event.preventDefault();
      back();
    }
  }

  const searching = !layout.rect && !targetMissing;

  return (
    <>
      {/* Visual-only dimming; pointer-events are off so the highlighted UI stays usable. */}
      {layout.rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-xl transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            top: layout.rect.top,
            left: layout.rect.left,
            width: layout.rect.width,
            height: layout.rect.height,
            boxShadow: "0 0 0 2px #f97316, 0 0 0 9999px rgba(0,0,0,0.62)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-black/60" />
      )}

      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-placement={placed.placement}
        className="fixed z-[70] rounded-2xl border border-orange-500/40 bg-[#171717] p-5 text-sm text-white shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        style={{
          top: placed.top,
          left: placed.left,
          width: placed.width ?? Math.min(360, viewport.width - 24),
          maxHeight: viewport.height - 24,
          overflowY: "auto",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-300">
            {chapter.title} · {label}
          </p>
          <button
            type="button"
            onClick={exit}
            aria-label="Exit tutorial"
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div
          role="progressbar"
          aria-label="Tutorial progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={state.stepIndex + 1}
          aria-valuetext={label}
          className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${((state.stepIndex + 1) / total) * 100}%` }} />
        </div>

        <h2 id="tour-title" className="mt-4 text-base font-semibold">
          {step.title}
        </h2>
        <div id="tour-body" className="mt-2 space-y-2 text-white/80">
          <p>{step.body}</p>
          <p className="text-white/65">{step.why}</p>
        </div>

        {searching && <p className="mt-3 text-xs text-white/60">Looking for this on the page…</p>}
        {targetMissing && (
          <p role="status" className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-white/75">
            This part isn&apos;t showing right now (it may need data first, or it&apos;s hidden on this screen). You can read the tip above and continue.
          </p>
        )}

        {step.action && !targetMissing && (
          <p
            role="status"
            className={`mt-3 rounded-lg p-2 text-xs ${actionDone ? "bg-green-500/10 text-green-300" : "bg-orange-500/10 text-orange-200"}`}
          >
            {actionDone ? "✓ Nice, that worked. Press Next." : `Your turn: ${step.action.instruction}`}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={back}
            disabled={state.stepIndex === 0}
            className="rounded-lg bg-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {needsAction && (
              <button type="button" onClick={skipStep} className="rounded-lg px-3 py-2 text-white/75 underline underline-offset-4 hover:text-white">
                Skip step
              </button>
            )}
            <button type="button" onClick={pause} className="rounded-lg px-3 py-2 text-white/75 hover:text-white">
              Pause
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {`${label}: ${step.title}.${actionDone ? " Step complete." : ""}`}
      </div>
    </>
  );
}
