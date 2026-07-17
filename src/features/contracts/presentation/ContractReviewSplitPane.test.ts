import { describe, expect, it } from "vitest";
import {
  MAX_CONTRACT_EDITOR_PERCENT,
  MIN_CONTRACT_EDITOR_PERCENT,
  normalizeContractEditorPercent,
} from "./contractReviewLayout";

describe("normalizeContractEditorPercent", () => {
  it("keeps the editor at least sixty percent wide", () => {
    expect(normalizeContractEditorPercent(20)).toBe(MIN_CONTRACT_EDITOR_PERCENT);
    expect(normalizeContractEditorPercent(60)).toBe(60);
  });

  it("caps and normalizes invalid values", () => {
    expect(normalizeContractEditorPercent(95)).toBe(MAX_CONTRACT_EDITOR_PERCENT);
    expect(normalizeContractEditorPercent(Number.NaN)).toBe(64);
  });
});
