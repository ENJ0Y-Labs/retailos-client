"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  CHAPTERS,
  IDLE,
  emptyProgress,
  getChapter,
  getStep,
  parseProgress,
  serializeProgress,
  shouldShowWelcome,
  storageKey,
  tourReducer,
  withActive,
  withChapterCompleted,
  withWelcome,
} from "@/lib/tour-core.mjs";
import type { TourAction, TourChapter, TourProgress, TourState, TourStep } from "@/lib/tour-core.mjs";
import TourOverlay from "@/components/tour/TourOverlay";
import WelcomeDialog from "@/components/tour/WelcomeDialog";

type TourContextValue = {
  chapters: TourChapter[];
  state: TourState;
  chapter: TourChapter | null;
  step: TourStep | null;
  progress: TourProgress;
  /** True once the user has really performed the current step's action. */
  actionDone: boolean;
  markActionDone: () => void;
  welcomeOpen: boolean;
  startChapter: (chapterId: string, stepIndex?: number) => void;
  next: () => void;
  back: () => void;
  skipStep: () => void;
  pause: () => void;
  resume: () => void;
  exit: () => void;
  openWelcome: () => void;
  dismissWelcome: () => void;
  startFromWelcome: () => void;
  /** Saved, interrupted position that can be resumed. */
  resumePoint: { chapterId: string; stepIndex: number } | null;
  resumeSaved: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTour must be used inside TourProvider");
  return value;
}

/** Safe variant for components that may render outside the provider. */
export function useOptionalTour(): TourContextValue | null {
  return useContext(TourContext);
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode). The tour still works for this visit.
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userId = user?.id ?? null;

  const [state, setState] = useState<TourState>(IDLE);
  const stateRef = useRef<TourState>(IDLE);
  const [progress, setProgress] = useState<TourProgress>(() => emptyProgress());
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [welcomeForced, setWelcomeForced] = useState(false);
  const [doneKey, setDoneKey] = useState<string | null>(null);

  const pathnameRef = useRef(pathname);
  const pendingRoute = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pendingRoute.current === pathname) pendingRoute.current = null;
  }, [pathname]);

  // Load this user's tour progress (per account, per browser). Deferred with a
  // microtask like the other pages do so state is not set synchronously in an effect.
  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setProgress(parseProgress(readStorage(storageKey(userId))));
      setLoadedFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist progress once it has been loaded for the current user.
  useEffect(() => {
    if (userId === null || loadedFor !== userId) return;
    writeStorage(storageKey(userId), serializeProgress(progress));
  }, [progress, userId, loadedFor]);

  const dispatch = useCallback(
    (action: TourAction, extra?: { welcome?: "started" | "dismissed" }) => {
      const result = tourReducer(stateRef.current, action);
      const nextState = result.state;
      stateRef.current = nextState;
      setState(nextState);
      setProgress((current) => {
        let updated = current;
        if (extra?.welcome) updated = withWelcome(updated, extra.welcome);
        if (result.completedChapterId) updated = withChapterCompleted(updated, result.completedChapterId);
        return action.type === "pause" ? updated : withActive(updated, nextState);
      });

      // Only the user's own Start / Next / Back / Resume navigates; manual
      // navigation never gets overridden (see the pause effect below).
      if (nextState.status === "running") {
        const step = getStep(nextState.chapterId, nextState.stepIndex);
        if (step && step.route !== pathnameRef.current) {
          pendingRoute.current = step.route;
          router.push(step.route);
        }
      }
    },
    [router],
  );

  // If the user leaves the tour's page on their own, pause instead of fighting them.
  useEffect(() => {
    if (state.status !== "running") return;
    const step = getStep(state.chapterId, state.stepIndex);
    if (!step || step.route === pathname || pendingRoute.current === step.route) return;
    queueMicrotask(() => dispatch({ type: "pause" }));
  }, [pathname, state, dispatch]);

  const chapter = getChapter(state.chapterId);
  const step = getStep(state.chapterId, state.stepIndex);
  const stepKey = state.chapterId ? `${state.chapterId}:${state.stepIndex}` : null;

  const welcomeOpen =
    userId !== null &&
    loadedFor === userId &&
    state.status === "idle" &&
    (welcomeForced || (pathname === "/dashboard" && shouldShowWelcome(progress)));

  const startChapter = useCallback(
    (chapterId: string, stepIndex = 0) => {
      setWelcomeForced(false);
      dispatch({ type: "start", chapterId, stepIndex });
    },
    [dispatch],
  );

  const value = useMemo<TourContextValue>(
    () => ({
      chapters: CHAPTERS as TourChapter[],
      state,
      chapter,
      step,
      progress,
      actionDone: stepKey !== null && doneKey === stepKey,
      markActionDone: () => setDoneKey(stepKey),
      welcomeOpen,
      startChapter,
      next: () => dispatch({ type: "next" }),
      back: () => dispatch({ type: "back" }),
      skipStep: () => dispatch({ type: "skip-step" }),
      pause: () => dispatch({ type: "pause" }),
      resume: () => dispatch({ type: "resume" }),
      exit: () => dispatch({ type: "exit" }),
      openWelcome: () => setWelcomeForced(true),
      dismissWelcome: () => {
        setWelcomeForced(false);
        setProgress((current) => withWelcome(current, current.welcome === "completed" ? "completed" : "dismissed"));
      },
      startFromWelcome: () => {
        setWelcomeForced(false);
        dispatch({ type: "start", chapterId: "start", stepIndex: 0 }, { welcome: "started" });
      },
      resumePoint: progress.active,
      resumeSaved: () => {
        if (progress.active) startChapter(progress.active.chapterId, progress.active.stepIndex);
      },
    }),
    [state, chapter, step, progress, stepKey, doneKey, welcomeOpen, startChapter, dispatch],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {userId !== null && (
        <>
          <WelcomeDialog />
          <TourOverlay />
        </>
      )}
    </TourContext.Provider>
  );
}
