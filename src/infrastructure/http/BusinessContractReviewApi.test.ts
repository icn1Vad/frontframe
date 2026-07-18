import { describe, expect, it, vi } from "vitest";
import { BusinessContractReviewApi } from "./BusinessContractReviewApi";
import type { HttpClient } from "./HttpClient";

const succeededTask = {
  taskId: "contract-review-1",
  contract: { fileId: "contract-file", fileName: "采购合同.docx" },
  policies: [{ fileId: "policy-file", fileName: "采购制度.docx" }],
  status: "SUCCEEDED",
  progress: 100,
  currentStage: "审查完成",
  error: null,
  createdAt: "2026-07-18 10:00:00",
  startedAt: "2026-07-18 10:00:01",
  completedAt: "2026-07-18 10:00:02",
  updatedAt: "2026-07-18 10:00:02",
};

describe("BusinessContractReviewApi", () => {
  it("兼容使用已上传的合同和制度 fileId 创建任务", async () => {
    const request = vi.fn().mockResolvedValue({ ...succeededTask, status: "CREATED", progress: 0 });
    const api = new BusinessContractReviewApi({ request } as unknown as HttpClient);

    await api.createTask({
      contractFileId: "contract-file",
      policyFileIds: ["policy-1", "policy-2"],
      name: "不会提交.docx",
      size: 100,
      stance: "neutral",
      modules: ["transaction"],
    }, { idempotencyKey: "idem-create" });

    expect(request).toHaveBeenCalledWith("/business/contract-reviews/tasks", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        contractFileId: "contract-file",
        policyFileIds: ["policy-1", "policy-2"],
      }),
      idempotencyKey: "idem-create",
    }));
  });

  it("单合同流程上传 CONTRACT 后直接进入临时预览且不创建正式任务", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        fileId: "uploaded-contract",
        fileName: "采购合同.docx",
        size: 4,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        documentType: "CONTRACT",
      });
    const api = new BusinessContractReviewApi({ request } as unknown as HttpClient);

    const task = await api.createTask({
      file: new File(["docx"], "采购合同.docx"),
      name: "采购合同（甲方）.docx",
      size: 4,
      stance: "party-a",
      modules: ["transaction", "termination"],
    }, { idempotencyKey: "idem-single-contract" });

    expect(request).toHaveBeenCalledTimes(1);
    const [uploadPath, uploadOptions] = request.mock.calls[0];
    expect(uploadPath).toBe("/business/documents");
    expect(uploadOptions).toMatchObject({
      method: "POST",
      idempotencyKey: "idem-single-contract:document",
    });
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    expect(uploadOptions.body.get("documentType")).toBe("CONTRACT");

    expect(task).toMatchObject({
      id: "contract-preview-uploaded-contract",
      status: "preview",
      contractFileId: "uploaded-contract",
      policies: [],
      currentStage: "未选择制度依据，仅进入临时预览",
    });
  });

  it("成功任务按 taskId 查询结果并映射制度依据和风险", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(succeededTask)
      .mockResolvedValueOnce({
        taskId: succeededTask.taskId,
        contract: succeededTask.contract,
        policies: succeededTask.policies,
        summary: { conclusion: "存在风险", totalCount: 1, highCount: 1, mediumCount: 0, lowCount: 0, overallRisk: "HIGH" },
        findings: [{
          findingId: "finding-1",
          category: "APPROVAL_AUTHORITY",
          severity: "HIGH",
          title: "审批主体不一致",
          contractLocation: "第十二条",
          contractExcerpt: "部门负责人签字后生效。",
          policyReference: { fileId: "policy-file", fileName: "采购制度.docx", location: "第三章", excerpt: "应由分管负责人审批。" },
          issue: "缺少分管负责人审批。",
          suggestion: "补充分管负责人审批。",
        }],
        generatedAt: "2026-07-18 10:00:02",
      });
    const api = new BusinessContractReviewApi({ request } as unknown as HttpClient);

    const task = await api.getTask("contract-review-1");

    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/business/contract-reviews/tasks/contract-review-1",
      "/business/contract-reviews/tasks/contract-review-1/result",
    ]);
    expect(task).toMatchObject({
      status: "reported",
      contractFileId: "contract-file",
      policies: [{ fileId: "policy-file", fileName: "采购制度.docx" }],
      risks: [{ id: "finding-1", level: "high", originalText: "部门负责人签字后生效。" }],
    });
  });

  it("失败任务展示 Java 错误且不查询结果", async () => {
    const request = vi.fn().mockResolvedValue({
      ...succeededTask,
      status: "FAILED",
      progress: 45,
      currentStage: "解析合同",
      error: { code: "CONTRACT_REVIEW_FAILED", message: "合同解析失败", retryable: true },
    });
    const api = new BusinessContractReviewApi({ request } as unknown as HttpClient);

    const task = await api.getTask("contract-review-1");

    expect(request).toHaveBeenCalledTimes(1);
    expect(task).toMatchObject({
      status: "failed",
      error: { message: "合同解析失败", retryable: true },
    });
  });
});
