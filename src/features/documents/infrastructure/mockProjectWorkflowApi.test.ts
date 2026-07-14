import { describe, expect, it } from "vitest";

import {
  createClassificationCandidateId,
  createDocumentId,
  createReviewTaskId,
} from "../domain";
import { MockDocumentRepository } from "./mockDocumentRepository";
import {
  MockClassificationTaskPoolApi,
  MockClassificationWorkflowApi,
  MockKnowledgeApi,
  MockReviewTaskPoolApi,
} from "./mockProjectWorkflowApi";

describe("MockClassificationWorkflowApi", () => {
  it("filters and paginates candidates on the service boundary", async () => {
    const api = new MockClassificationWorkflowApi(new MockDocumentRepository());
    const result = await api.listCandidates({
      page: 1,
      pageSize: 10,
      states: ["classifying"],
      types: ["report"],
    });

    expect(result).toMatchObject({ total: 1, pageCount: 1 });
    expect(result.items[0]).toMatchObject({
      id: "candidate_compliance_report",
      state: "classifying",
    });
  });

  it("returns partial failures, moves successes to the task pool, and rejects late AI writes", async () => {
    const repository = new MockDocumentRepository();
    const api = new MockClassificationWorkflowApi(repository);
    const confirmedId = createClassificationCandidateId(
      "candidate_compliance_report",
    );
    const conflictId = createClassificationCandidateId(
      "candidate_purchase_policy",
    );

    const result = await api.confirmCandidates(
      [
        {
          id: confirmedId,
          name: "年度合规报告（人工确认）.pdf",
          type: "report",
          level: "company",
          category: "supply-chain",
          expectedVersion: 1,
          manualOverride: true,
        },
        {
          id: conflictId,
          name: "采购管理办法（修订稿）.docx",
          type: "policy",
          level: "company",
          category: "procurement",
          expectedVersion: 99,
          manualOverride: false,
        },
      ],
      { idempotencyKey: "confirm-partial-test" },
    );

    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toEqual([
      expect.objectContaining({ id: conflictId, code: "conflict" }),
    ]);
    expect(
      repository.getFromCollection(
        "classification",
        createDocumentId(`doc_${confirmedId}`),
      ),
    ).toMatchObject({
      name: "年度合规报告（人工确认）.pdf",
      state: { kind: "pending" },
    });
    expect(
      api.applyAiClassification(
        confirmedId,
        { type: "other", level: "department", category: "administration" },
        1,
      ),
    ).toBe(false);
  });

  it("keeps failed delete items while deleting valid current-page selections", async () => {
    const api = new MockClassificationWorkflowApi(new MockDocumentRepository());
    const validId = createClassificationCandidateId("candidate_project_contract");
    const conflictId = createClassificationCandidateId("candidate_regulations");
    const result = await api.softDeleteCandidates(
      [
        { id: validId, expectedVersion: 1 },
        { id: conflictId, expectedVersion: 2 },
      ],
      { idempotencyKey: "delete-partial-test" },
    );

    expect(result.succeeded.map((item) => item.id)).toEqual([validId]);
    expect(result.failed).toEqual([
      expect.objectContaining({ id: conflictId, code: "conflict" }),
    ]);
    const remaining = await api.listCandidates({ page: 1, pageSize: 10 });
    expect(remaining.items.map((item) => item.id)).toContain(conflictId);
    expect(remaining.items.map((item) => item.id)).not.toContain(validId);
  });
});

describe("task pool deletion semantics", () => {
  it("creates and retains a termination report when a reviewing task is deleted", async () => {
    const repository = new MockDocumentRepository();
    const api = new MockReviewTaskPoolApi(repository);
    const documentId = createDocumentId("doc_purchase_policy_review_v1");
    const reviewTaskId = createReviewTaskId("review_purchase_policy_v1");

    const deleted = await api.softDelete(documentId, {
      idempotencyKey: "terminate-review-test",
    });
    const report = await api.getReport(reviewTaskId);

    expect(deleted.state).toMatchObject({
      kind: "deleted",
      previousKind: "reviewing",
      reviewTaskId,
    });
    expect(report?.content).toContain("30%");
  });

  it("soft-deletes the direct source task when published knowledge is deleted", async () => {
    const repository = new MockDocumentRepository();
    const classificationTasks = new MockClassificationTaskPoolApi(repository);
    const knowledge = new MockKnowledgeApi(repository);
    const documentId = createDocumentId("doc_purchase_policy_draft_2026");

    await classificationTasks.publish(documentId, {
      idempotencyKey: "publish-knowledge-test",
    });
    await knowledge.softDelete(documentId, {
      idempotencyKey: "delete-knowledge-test",
    });

    expect(repository.getFromCollection("knowledge", documentId)).toBeNull();
    expect(
      repository.getFromCollection("classification", documentId)?.state,
    ).toMatchObject({ kind: "deleted", reason: "knowledge-deleted" });
  });
});
