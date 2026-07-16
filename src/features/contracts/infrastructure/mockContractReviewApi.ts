import type { ContractReviewApi } from "../application";
import type {
  ContractClause,
  ContractReviewModuleId,
  ContractReviewTask,
  ContractRisk,
  CreateContractReviewTaskInput,
} from "../domain";
import { isContractEditorSession } from "../domain";

const storageKey = "proofspace.contract-review.tasks.v3";

const clauses: readonly ContractClause[] = [
  {
    id: "clause-purpose",
    number: "第一条",
    title: "合同目的",
    text: "甲方委托乙方提供软件技术服务，乙方按照本合同约定完成系统部署、技术支持及相关服务。",
  },
  {
    id: "clause-data",
    number: "第六条",
    title: "数据安全与保密",
    text: "乙方可将服务过程中产生的数据用于模型训练、产品优化及其他内部用途，并应采取合理措施保护甲方信息。",
  },
  {
    id: "clause-acceptance",
    number: "第八条",
    title: "验收与付款",
    text: "甲方应在收到成果后五个工作日内完成验收；逾期未提出书面异议的，视为验收合格，甲方应按期支付服务费用。",
  },
  {
    id: "clause-ip",
    number: "第十一条",
    title: "知识产权",
    text: "乙方交付的成果及服务过程中形成的全部知识产权归甲方所有，乙方保证不向任何第三方主张权利。",
  },
  {
    id: "clause-termination",
    number: "第十四条",
    title: "合同终止",
    text: "合同终止后，乙方应根据甲方要求删除或返还相关资料，并配合甲方完成数据迁移和服务交接。",
  },
];

const riskDefinitions: readonly Omit<ContractRisk, "state">[] = [
  {
    id: "risk-data-training",
    clauseId: "clause-data",
    moduleId: "data-security",
    level: "high",
    title: "数据使用边界过宽",
    summary: "允许乙方将服务数据用于模型训练，但没有限定数据范围、脱敏要求和甲方授权条件。",
    suggestion: "未经甲方书面同意，乙方不得将甲方数据用于模型训练；确需使用时，应先完成脱敏并限定使用目的、期限和访问范围。",
    originalText: "乙方可将服务过程中产生的数据用于模型训练、产品优化及其他内部用途",
  },
  {
    id: "risk-acceptance-payment",
    clauseId: "clause-acceptance",
    moduleId: "performance-payment",
    level: "high",
    title: "验收与付款触发条件不清",
    summary: "逾期未提出异议即视为验收合格，可能与实际验收流程和付款节点发生冲突。",
    suggestion: "明确验收标准、异议处理机制以及付款触发条件；未经双方书面确认，不应仅以沉默推定验收完成。",
    originalText: "逾期未提出书面异议的，视为验收合格，甲方应按期支付服务费用",
  },
  {
    id: "risk-ip-scope",
    clauseId: "clause-ip",
    moduleId: "intellectual-property",
    level: "medium",
    title: "知识产权转让范围过宽",
    summary: "条款没有区分乙方既有工具、通用能力与本项目定制成果，可能导致权属争议。",
    suggestion: "区分项目定制成果、乙方既有知识产权和第三方素材，并分别约定使用许可、交付范围及权利归属。",
    originalText: "乙方交付的成果及服务过程中形成的全部知识产权归甲方所有",
  },
  {
    id: "risk-deletion",
    clauseId: "clause-termination",
    moduleId: "termination",
    level: "medium",
    title: "退出后的数据删除缺少期限",
    summary: "合同提到删除或返还资料，但没有约定完成期限、证明方式和备份清理要求。",
    suggestion: "约定终止后十五个工作日内完成返还或删除，并向甲方提供书面确认；备份数据应在合理期限内同步清理。",
    originalText: "合同终止后，乙方应根据甲方要求删除或返还相关资料",
  },
  {
    id: "risk-purpose",
    clauseId: "clause-purpose",
    moduleId: "transaction",
    level: "low",
    title: "服务交付边界仍需补充",
    summary: "合同目的描述较为概括，建议在附件中补充交付物、服务等级和责任边界。",
    suggestion: "在服务清单或技术附件中明确交付物、服务等级、支持时间和双方接口人。",
    originalText: "完成系统部署、技术支持及相关服务",
  },
  {
    id: "risk-authorization",
    clauseId: "clause-purpose",
    moduleId: "compliance",
    level: "medium",
    title: "主体授权和合规附件未明确",
    summary: "合同只描述委托关系，没有明确乙方履行服务所需的资质、授权和合规附件。",
    suggestion: "将乙方资质、分包限制、授权证明和适用合规要求列入合同附件，并约定持续有效义务。",
    originalText: "甲方委托乙方提供软件技术服务",
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readTasks(): ContractReviewTask[] {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ContractReviewTask[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }
  return clone(memoryTasks);
}

function writeTasks(tasks: readonly ContractReviewTask[]) {
  memoryTasks = [...clone(tasks)];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
  }
}

function createRisks(
  selectedModules: readonly ContractReviewModuleId[],
): ContractRisk[] {
  const moduleSet = new Set(selectedModules);
  return riskDefinitions
    .filter((risk) => moduleSet.has(risk.moduleId))
    .map((risk) => ({ ...risk, state: "open" as const }));
}

function createTaskRecord(
  input: CreateContractReviewTaskInput & {
    readonly id: string;
    readonly status?: ContractReviewTask["status"];
    readonly progress?: number;
    readonly createdAt?: string;
  },
): ContractReviewTask {
  return {
    id: input.id,
    version: 1,
    name: input.name,
    size: input.size,
    stance: input.stance,
    modules: [...input.modules],
    status: input.status ?? "queued",
    progress: input.progress ?? 0,
    createdAt: input.createdAt ?? new Date().toISOString(),
    clauses: clone(clauses),
    risks: createRisks(input.modules),
  };
}

let memoryTasks: ContractReviewTask[] = [
  createTaskRecord({
    id: "contract-demo-001",
    name: "软件技术服务合同.docx",
    size: 248 * 1024,
    stance: "neutral",
    modules: [
      "transaction",
      "performance-payment",
      "data-security",
      "intellectual-property",
      "termination",
    ],
    status: "reported",
    progress: 100,
    createdAt: "2026-07-15T08:30:00.000Z",
  }),
];

function updateTask(
  taskId: string,
  expectedVersion: number | undefined,
  updater: (task: ContractReviewTask) => ContractReviewTask,
): ContractReviewTask {
  const tasks = readTasks();
  const current = tasks.find((task) => task.id === taskId);
  if (!current) throw new Error("合同审查任务不存在");
  if (expectedVersion !== undefined && current.version !== expectedVersion) {
    throw new Error("合同审查任务已被其他操作更新，请刷新后重试");
  }
  const updated = {
    ...updater(current),
    version: current.version + 1,
  };
  writeTasks(tasks.map((task) => (task.id === taskId ? updated : task)));
  return clone(updated);
}

export const mockContractReviewApi: ContractReviewApi = {
  async listTasks(options) {
    options?.signal?.throwIfAborted();
    return clone(
      readTasks().sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    );
  },

  async getTask(taskId, options) {
    options?.signal?.throwIfAborted();
    return clone(readTasks().find((task) => task.id === taskId));
  },

  async getEditorSession(taskId, options) {
    options?.signal?.throwIfAborted();
    if (typeof window === "undefined") {
      return { provider: "mock", reason: "在线编辑器仅在浏览器中初始化" };
    }
    try {
      const response = await fetch(
        `/api/contract-review/tasks/${encodeURIComponent(taskId)}/editor-session`,
        { headers: { Accept: "application/json" }, signal: options?.signal },
      );
      if (!response.ok) {
        return { provider: "mock", reason: `编辑器会话接口返回 ${response.status}` };
      }
      const session: unknown = await response.json();
      return isContractEditorSession(session)
        ? session
        : { provider: "mock", reason: "编辑器会话配置无效" };
    } catch {
      return { provider: "mock", reason: "编辑器会话接口暂不可用" };
    }
  },

  async createTask(input, options) {
    options.signal?.throwIfAborted();
    const task = createTaskRecord({
      ...input,
      id: `contract-${Date.now()}`,
    });
    writeTasks([task, ...readTasks()]);
    return clone(task);
  },

  async startReview(taskId, options) {
    options.signal?.throwIfAborted();
    return updateTask(taskId, options.expectedVersion, (task) => ({
      ...task,
      status: "reviewing",
      progress: Math.max(task.progress, 8),
    }));
  },

  async generateReport(taskId, options) {
    options.signal?.throwIfAborted();
    return updateTask(taskId, options.expectedVersion, (task) => ({
      ...task,
      status: "reported",
      progress: 100,
    }));
  },

  async updateRisk(taskId, riskId, command, options) {
    options.signal?.throwIfAborted();
    const reason = command.reason?.trim();
    if (command.state === "ignored" && !reason) {
      throw new Error("忽略风险时必须填写理由");
    }
    return updateTask(taskId, options.expectedVersion, (task) => ({
      ...task,
      risks: task.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              state: command.state,
              ...(command.state === "open"
                ? { resolution: undefined }
                : {
                    resolution: {
                      operator: "张三",
                      handledAt: new Date().toISOString(),
                      ...(reason ? { reason } : {}),
                    },
                  }),
            }
          : risk,
      ),
    }));
  },

  async storeTask(taskId, options) {
    options.signal?.throwIfAborted();
    return updateTask(taskId, options.expectedVersion, (task) => ({
      ...task,
      status: "stored",
    }));
  },
};
