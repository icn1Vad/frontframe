export const LANDING_SECTIONS = [
  { id: "product", label: "产品概况" },
  { id: "technology", label: "技术架构" },
  { id: "experience", label: "Experience 与登录" },
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];
export type LandingSectionIndex = 0 | 1 | 2;
export type SectionDirection = -1 | 1 | "first" | "last";

export interface SectionMetric {
  readonly top: number;
  readonly height: number;
}

export interface WheelAccumulation {
  readonly accumulated: number;
  readonly direction: -1 | 0 | 1;
}

export function clampSectionIndex(index: number): LandingSectionIndex {
  return Math.min(
    LANDING_SECTIONS.length - 1,
    Math.max(0, Math.round(index)),
  ) as LandingSectionIndex;
}

export function sectionIndexFromHash(
  hash: string,
): LandingSectionIndex | null {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const index = LANDING_SECTIONS.findIndex(
    (section) => section.id === normalizedHash,
  );
  return index < 0 ? null : (index as LandingSectionIndex);
}

export function directionFromKey(
  key: string,
  shiftKey = false,
): SectionDirection | null {
  if (key === "ArrowDown" || key === "PageDown" || (key === " " && !shiftKey)) {
    return 1;
  }
  if (key === "ArrowUp" || key === "PageUp" || (key === " " && shiftKey)) {
    return -1;
  }
  if (key === "Home") {
    return "first";
  }
  if (key === "End") {
    return "last";
  }
  return null;
}

export function sectionIndexAtViewportCenter(
  scrollTop: number,
  viewportHeight: number,
  sections: readonly SectionMetric[],
): LandingSectionIndex {
  const viewportCenter = scrollTop + viewportHeight / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const sectionCenter = section.top + section.height / 2;
    const containsCenter =
      viewportCenter >= section.top &&
      viewportCenter < section.top + section.height;
    const distance = containsCenter
      ? 0
      : Math.abs(sectionCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return clampSectionIndex(closestIndex);
}

export function accumulateWheelDelta(
  accumulated: number,
  delta: number,
  threshold = 48,
): WheelAccumulation {
  if (delta === 0) {
    return { accumulated, direction: 0 };
  }

  const sameDirection = accumulated === 0 || Math.sign(accumulated) === Math.sign(delta);
  const nextAccumulated = (sameDirection ? accumulated : 0) + delta;

  if (Math.abs(nextAccumulated) < threshold) {
    return { accumulated: nextAccumulated, direction: 0 };
  }

  return {
    accumulated: 0,
    direction: Math.sign(nextAccumulated) as -1 | 1,
  };
}

export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
): number {
  if (deltaMode === 1) {
    return deltaY * 16;
  }
  if (deltaMode === 2) {
    return deltaY * viewportHeight;
  }
  return deltaY;
}
