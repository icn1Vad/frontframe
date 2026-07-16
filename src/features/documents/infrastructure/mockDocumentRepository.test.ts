import { describe, expect, it } from "vitest";

import { createReviewTaskId } from "../domain";
import { MockDocumentRepository } from "./mockDocumentRepository";

const repository = new MockDocumentRepository();

describe("MockDocumentRepository.list", () => {
  it("returns stable pagination metadata and the requested page", async () => {
    const result = await repository.list({
      collection: "classification",
      page: 2,
      pageSize: 2,
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 5,
      pageCount: 3,
    });
    expect(result.items.map((document) => document.name)).toEqual([
      "供应商说明.pdf",
      "旧版制度.docx",
    ]);
  });

  it("searches document-facing text without changing the domain codes", async () => {
    const result = await repository.list({
      collection: "classification",
      page: 1,
      pageSize: 20,
      search: "供应商",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      name: "供应商说明.pdf",
      type: "report",
      category: "supply-chain",
    });
  });

  it("combines type, level, and state filters", async () => {
    const result = await repository.list({
      collection: "review",
      page: 1,
      pageSize: 20,
      types: ["policy"],
      levels: ["company"],
      states: ["reviewed"],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("供应商管理制度.docx");
    expect(result.items[0].state.kind).toBe("reviewed");
  });

  it("sorts by the timestamp represented by each discriminated state", async () => {
    const result = await repository.list({
      collection: "knowledge",
      page: 1,
      pageSize: 20,
      sort: { by: "updatedAt", direction: "asc" },
    });

    expect(result.items.map((document) => document.name)).toEqual([
      "法律法规汇编.pdf",
      "示例项目合同.pdf",
      "采购管理办法.docx",
    ]);
  });

  it("rejects an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      repository.list(
        {
          collection: "knowledge",
          page: 1,
          pageSize: 20,
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("MockDocumentRepository.getByReviewTaskId", () => {
  it("finds a review-backed document and returns null for an unknown task", async () => {
    const document = await repository.getByReviewTaskId(
      createReviewTaskId("review_supplier_policy_v1"),
    );
    const missing = await repository.getByReviewTaskId(
      createReviewTaskId("review_missing"),
    );

    expect(document).toMatchObject({
      name: "供应商管理制度.docx",
      state: {
        kind: "reviewed",
        reviewTaskId: "review_supplier_policy_v1",
      },
    });
    expect(missing).toBeNull();
  });
});
