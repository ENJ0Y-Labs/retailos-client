export type TourActionType = "click" | "input";

export type TourStep = {
  id: string;
  target: string;
  route: string;
  title: string;
  body: string;
  why: string;
  action?: { type: TourActionType; instruction: string; selector?: string };
};

export type TourChapter = {
  id: string;
  title: string;
  summary: string;
  route: string;
  steps: TourStep[];
};

export type TourStatus = "idle" | "running" | "paused";

export type TourState = {
  status: TourStatus;
  chapterId: string | null;
  stepIndex: number;
};

export type TourAction =
  | { type: "start"; chapterId: string; stepIndex?: number }
  | { type: "next" }
  | { type: "skip-step" }
  | { type: "back" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "exit" };

export type TourProgress = {
  version: number;
  welcome: null | "started" | "dismissed" | "completed";
  completed: Record<string, true>;
  active: { chapterId: string; stepIndex: number } | null;
};

export type Rect = { top: number; left: number; width: number; height: number };

export type PopoverPlacement = {
  placement: "bottom" | "top" | "right" | "left" | "center" | "sheet";
  top: number;
  left: number;
  width?: number;
};

export const TOUR_STORAGE_VERSION: number;
export const CHAPTERS: TourChapter[];
export const IDLE: Readonly<TourState>;
export function getChapter(chapterId: string | null): TourChapter | null;
export function getStep(chapterId: string | null, stepIndex: number): TourStep | null;
export function chapterForPath(pathname: string): TourChapter | null;
export function progressLabel(chapterId: string | null, stepIndex: number): string;
export function tourReducer(
  state: TourState,
  action: TourAction,
): { state: TourState; completedChapterId: string | null };
export function storageKey(userId: number | string): string;
export function emptyProgress(): TourProgress;
export function parseProgress(raw: string | null | undefined): TourProgress;
export function serializeProgress(progress: TourProgress): string;
export function shouldShowWelcome(progress: TourProgress): boolean;
export function withWelcome(progress: TourProgress, welcome: TourProgress["welcome"]): TourProgress;
export function withChapterCompleted(progress: TourProgress, chapterId: string): TourProgress;
export function withActive(progress: TourProgress, state: TourState): TourProgress;
export function placePopover(args: {
  rect: Rect | null;
  popover: { width: number; height: number };
  viewport: { width: number; height: number };
  gap?: number;
  margin?: number;
}): PopoverPlacement;
export function isRectVisible(rect: Rect | null | undefined): boolean;
