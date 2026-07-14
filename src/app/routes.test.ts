import { describe, expect, it } from "vitest";

import { routes, type AppRoute } from "./routes";

describe("canonical task pool routes", () => {
  it("uses plural task-pool paths", () => {
    expect(routes.classificationTasks).toBe("/classification-tasks");
    expect(routes.reviewTasks).toBe("/review-tasks");
  });
});

describe("routes.reviewReport", () => {
  it("trims and URL-encodes the review task id as one path segment", () => {
    const href: AppRoute = routes.reviewReport(" review/task ?#中文 ");

    expect(href).toBe(
      "/review-tasks/review%2Ftask%20%3F%23%E4%B8%AD%E6%96%87/report",
    );
  });

  it.each(["", "   ", "\t\n"])("rejects an empty task id (%j)", (taskId) => {
    expect(() => routes.reviewReport(taskId)).toThrow(
      "Review task id cannot be empty.",
    );
  });
});
