import { describe, expect, it } from "vitest";
import { createIdempotencyKey } from "./idempotency";

describe("createIdempotencyKey", () => {
  it("生成后端约定的 UUID", () => {
    expect(createIdempotencyKey("upload"))
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
