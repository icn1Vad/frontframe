import { describe, expect, it } from "vitest";

import {
  createDocumentId,
  createIsoDateTime,
  createReviewProgress,
  createReviewTaskId,
  createUserId,
  getDocumentReviewTaskId,
  getDocumentStateTimestamp,
  type DocumentState,
} from "./document";

describe("document branded values", () => {
  it("trims valid ids and rejects empty document, review-task, and user ids", () => {
    expect(createDocumentId(" document-1 ")).toBe("document-1");
    expect(createReviewTaskId(" review-1 ")).toBe("review-1");
    expect(createUserId(" user-1 ")).toBe("user-1");

    for (const createId of [
      createDocumentId,
      createReviewTaskId,
      createUserId,
    ]) {
      expect(() => createId(" \t\n ")).toThrow(/cannot be empty/i);
    }
  });

  it("accepts an ISO date-time and rejects non-ISO or impossible values", () => {
    expect(createIsoDateTime("2026-07-05T10:24:00+08:00")).toBe(
      "2026-07-05T10:24:00+08:00",
    );
    expect(() => createIsoDateTime("July 5, 2026 10:24")).toThrow(
      "Invalid ISO date-time",
    );
    expect(() => createIsoDateTime("2026-99-99T10:24:00Z")).toThrow(
      "Invalid ISO date-time",
    );
  });

  it("accepts progress boundaries and rejects out-of-range or non-finite progress", () => {
    expect(createReviewProgress(0)).toBe(0);
    expect(createReviewProgress(100)).toBe(100);

    for (const progress of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createReviewProgress(progress)).toThrow(
        "Review progress must be between 0 and 100",
      );
    }
  });
});

describe("document state projections", () => {
  it("extracts the appropriate timestamp from every state variant", () => {
    const time = createIsoDateTime("2026-07-05T10:24:00+08:00");
    const reviewTaskId = createReviewTaskId("review-1");
    const states: readonly DocumentState[] = [
      { kind: "pending", queuedAt: time },
      { kind: "classified", classifiedAt: time },
      {
        kind: "reviewing",
        reviewTaskId,
        startedAt: time,
        progress: createReviewProgress(30),
      },
      { kind: "reviewed", reviewTaskId, reviewedAt: time },
      { kind: "published", source: "classification", publishedAt: time },
      {
        kind: "published",
        source: "review",
        reviewTaskId,
        publishedAt: time,
      },
      { kind: "deleted", deletedAt: time },
    ];

    expect(states.map(getDocumentStateTimestamp)).toEqual(
      states.map(() => time),
    );
  });

  it("returns reviewTaskId only for review-backed states", () => {
    const time = createIsoDateTime("2026-07-05T10:24:00+08:00");
    const reviewTaskId = createReviewTaskId("review-1");

    expect(
      getDocumentReviewTaskId({
        kind: "reviewing",
        reviewTaskId,
        startedAt: time,
        progress: createReviewProgress(30),
      }),
    ).toBe(reviewTaskId);
    expect(
      getDocumentReviewTaskId({ kind: "reviewed", reviewTaskId, reviewedAt: time }),
    ).toBe(reviewTaskId);
    expect(
      getDocumentReviewTaskId({
        kind: "published",
        source: "review",
        reviewTaskId,
        publishedAt: time,
      }),
    ).toBe(reviewTaskId);
    expect(
      getDocumentReviewTaskId({
        kind: "published",
        source: "classification",
        publishedAt: time,
      }),
    ).toBeUndefined();
    expect(
      getDocumentReviewTaskId({ kind: "pending", queuedAt: time }),
    ).toBeUndefined();
  });
});
