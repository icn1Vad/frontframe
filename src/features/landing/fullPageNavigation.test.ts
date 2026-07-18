import { describe, expect, it } from "vitest";
import {
  accumulateWheelDelta,
  clampSectionIndex,
  directionFromKey,
  normalizeWheelDelta,
  resolveFullPageMode,
  sectionIndexAtViewportCenter,
  sectionIndexFromHash,
} from "./fullPageNavigation";

describe("landing section indexes", () => {
  it("clamps navigation to the three available sections", () => {
    expect(clampSectionIndex(-2)).toBe(0);
    expect(clampSectionIndex(1)).toBe(1);
    expect(clampSectionIndex(8)).toBe(2);
  });

  it("maps known hashes without accepting unrelated anchors", () => {
    expect(sectionIndexFromHash("#product")).toBe(0);
    expect(sectionIndexFromHash("technology")).toBe(1);
    expect(sectionIndexFromHash("#experience")).toBe(2);
    expect(sectionIndexFromHash("#unknown")).toBeNull();
  });

  it("selects the section containing the viewport center", () => {
    const sections = [
      { top: 0, height: 800 },
      { top: 800, height: 1200 },
      { top: 2000, height: 800 },
    ];

    expect(sectionIndexAtViewportCenter(0, 800, sections)).toBe(0);
    expect(sectionIndexAtViewportCenter(900, 800, sections)).toBe(1);
    expect(sectionIndexAtViewportCenter(2100, 800, sections)).toBe(2);
  });
});

describe("landing full-page mode", () => {
  it("keeps strict navigation through desktop zoom breakpoints when content fits", () => {
    expect(
      resolveFullPageMode({
        viewportWidth: 900,
        viewportHeight: 760,
        sectionHeights: [760, 764, 771],
      }),
    ).toBe("strict");
  });

  it("absorbs only small browser rounding differences", () => {
    expect(
      resolveFullPageMode({
        viewportWidth: 1200,
        viewportHeight: 800,
        sectionHeights: [800, 812, 801],
      }),
    ).toBe("strict");
    expect(
      resolveFullPageMode({
        viewportWidth: 1200,
        viewportHeight: 800,
        sectionHeights: [800, 813, 801],
      }),
    ).toBe("natural");
  });

  it("falls back to natural scrolling for narrow or overflowing layouts", () => {
    expect(
      resolveFullPageMode({
        viewportWidth: 767,
        viewportHeight: 800,
        sectionHeights: [800, 800, 800],
      }),
    ).toBe("natural");
    expect(
      resolveFullPageMode({
        viewportWidth: 1440,
        viewportHeight: 800,
        sectionHeights: [800, 920, 800],
      }),
    ).toBe("natural");
  });
});

describe("landing keyboard navigation", () => {
  it("maps paging and direction keys", () => {
    expect(directionFromKey("ArrowDown")).toBe(1);
    expect(directionFromKey("PageDown")).toBe(1);
    expect(directionFromKey("ArrowUp")).toBe(-1);
    expect(directionFromKey("PageUp")).toBe(-1);
    expect(directionFromKey("Home")).toBe("first");
    expect(directionFromKey("End")).toBe("last");
  });

  it("maps Space according to the Shift modifier", () => {
    expect(directionFromKey(" ")).toBe(1);
    expect(directionFromKey(" ", true)).toBe(-1);
    expect(directionFromKey("Tab")).toBeNull();
  });
});

describe("landing wheel normalization", () => {
  it("accumulates trackpad movement until the threshold", () => {
    const first = accumulateWheelDelta(0, 12);
    const second = accumulateWheelDelta(first.accumulated, 18);
    const third = accumulateWheelDelta(second.accumulated, 20);

    expect(first.direction).toBe(0);
    expect(second.direction).toBe(0);
    expect(third).toEqual({ accumulated: 0, direction: 1 });
  });

  it("resets accumulated movement when direction changes", () => {
    expect(accumulateWheelDelta(30, -20)).toEqual({
      accumulated: -20,
      direction: 0,
    });
  });

  it("normalizes line and page based wheel events", () => {
    expect(normalizeWheelDelta(2, 1, 800)).toBe(32);
    expect(normalizeWheelDelta(1, 2, 800)).toBe(800);
    expect(normalizeWheelDelta(24, 0, 800)).toBe(24);
  });
});
