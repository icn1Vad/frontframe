import { describe, expect, it } from "vitest";

import {
  createDocumentId,
  createIsoDateTime,
  createReviewProgress,
  createReviewTaskId,
  createUserId,
  type DocumentState,
  type DocumentSummary,
} from "../domain";
import {
  classificationDocumentActions,
  knowledgeDocumentActions,
  reviewDocumentActions,
} from "./documentActionDefinitions";
import type { DocumentActionDefinition } from "./documentActions";

const timestamp = createIsoDateTime("2026-07-14T08:00:00+08:00");
const reviewTaskId = createReviewTaskId("review-action-matrix");

function documentWith(state: DocumentState): DocumentSummary {
  return {
    id: createDocumentId(`document-${state.kind}`),
    name: "操作矩阵测试.pdf",
    type: "policy",
    level: "company",
    category: "administration",
    state,
    operator: { id: createUserId("tester"), displayName: "测试员" },
    capabilities: { canDelete: true },
  };
}

function visibleActionIds(
  actions: readonly DocumentActionDefinition[],
  document: DocumentSummary,
) {
  return actions
    .filter((action) => !action.isVisible || action.isVisible(document))
    .map((action) => action.id);
}

describe("document action matrix", () => {
  it("matches all classification task pool states", () => {
    expect(
      classificationDocumentActions
        .filter((action) => action.type === "command")
        .map((action) => action.label),
    ).toEqual(["直接入库", "开始审查"]);
    expect(
      visibleActionIds(
        classificationDocumentActions,
        documentWith({ kind: "pending", queuedAt: timestamp }),
      ),
    ).toEqual(["preview", "publish", "start-review", "delete"]);
    expect(
      visibleActionIds(
        classificationDocumentActions,
        documentWith({ kind: "published", source: "classification", publishedAt: timestamp }),
      ),
    ).toEqual(["preview"]);
    expect(
      visibleActionIds(
        classificationDocumentActions,
        documentWith({ kind: "reviewing", reviewTaskId, startedAt: timestamp, progress: createReviewProgress(20) }),
      ),
    ).toEqual(["preview"]);
    expect(
      visibleActionIds(
        classificationDocumentActions,
        documentWith({ kind: "deleted", deletedAt: timestamp, previousKind: "pending" }),
      ),
    ).toEqual(["preview"]);
  });

  it("matches all review task pool states in view-change-delete order", () => {
    expect(
      visibleActionIds(
        reviewDocumentActions,
        documentWith({ kind: "reviewing", reviewTaskId, startedAt: timestamp, progress: createReviewProgress(20) }),
      ),
    ).toEqual(["progress", "delete"]);
    expect(
      visibleActionIds(
        reviewDocumentActions,
        documentWith({ kind: "reviewed", reviewTaskId, reviewedAt: timestamp }),
      ),
    ).toEqual(["report", "publish", "delete"]);
    expect(
      visibleActionIds(
        reviewDocumentActions,
        documentWith({ kind: "published", source: "review", reviewTaskId, publishedAt: timestamp }),
      ),
    ).toEqual(["report"]);
    expect(
      visibleActionIds(
        reviewDocumentActions,
        documentWith({ kind: "deleted", deletedAt: timestamp, previousKind: "reviewed", reviewTaskId }),
      ),
    ).toEqual(["report"]);
  });

  it("switches knowledge viewing action by direct source and always permits delete", () => {
    expect(
      visibleActionIds(
        knowledgeDocumentActions,
        documentWith({ kind: "published", source: "classification", publishedAt: timestamp }),
      ),
    ).toEqual(["preview", "delete"]);
    expect(
      visibleActionIds(
        knowledgeDocumentActions,
        documentWith({ kind: "published", source: "review", reviewTaskId, publishedAt: timestamp }),
      ),
    ).toEqual(["report", "delete"]);
  });
});
