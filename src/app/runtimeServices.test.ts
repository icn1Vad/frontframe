import { describe, expect, it } from "vitest";
import { isJavaSliceEnabled } from "./runtimeServices";

describe("isJavaSliceEnabled", () => {
  it("requires an explicit true value", () => {
    expect(isJavaSliceEnabled("true")).toBe(true);
    expect(isJavaSliceEnabled(" TRUE ")).toBe(true);
    expect(isJavaSliceEnabled("false")).toBe(false);
    expect(isJavaSliceEnabled(undefined)).toBe(false);
  });
});
