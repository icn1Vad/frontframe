import { ArrowRight, Clock3, FileText, Play, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import type { ContractReviewApi } from "../application";
import {
  contractReviewStanceLabels,
  getContractReviewModuleLabel,
  type ContractReviewTask,
  type ContractReviewTaskStatus,
} from "../domain";
import { routes } from "../../../app";
import { createIdempotencyKey } from "../../../shared/lib/idempotency";
import { PageStack, PageToolbar, StatGrid, Status, Surface } from "../../../shared/ui";

export interface ContractReviewTasksScreenProps {
  readonly api: ContractReviewApi;
}

type TaskFilter = "all" | ContractReviewTaskStatus;

function taskStatusMeta(status: ContractReviewTaskStatus) {
  switch (status) {
    case "queued":
      return { label: "待开始", tone: "neutral" as const };
    case "reviewing":
      return { label: "审查中", tone: "info" as const };
    case "reported":
      return { label: "报告已生成", tone: "warning" as const };
    case "stored":
      return { label: "已入库", tone: "success" as const };
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} 兆字节`
    : `${Math.max(1, Math.round(size / 1024))} 千字节`;
}

export function ContractReviewTasksScreen({ api }: ContractReviewTasksScreenProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<readonly ContractReviewTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.listTasks());
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "任务池加载失败");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(
    () => filter === "all" ? tasks : tasks.filter((task) => task.status === filter),
    [filter, tasks],
  );
  const counts = useMemo(() => ({
    total: tasks.length,
    queued: tasks.filter((task) => task.status === "queued").length,
    reviewing: tasks.filter((task) => task.status === "reviewing").length,
    reported: tasks.filter((task) => task.status === "reported").length,
    stored: tasks.filter((task) => task.status === "stored").length,
  }), [tasks]);

  const openTask = async (task: ContractReviewTask) => {
    setBusyTaskId(task.id);
    setFeedback(null);
    try {
      if (task.status === "queued") {
        await api.startReview(task.id, {
          idempotencyKey: createIdempotencyKey("start-contract-review"),
          expectedVersion: task.version,
        });
      }
      await router.push(routes.contractReviewTask(task.id));
    } catch (error) {
      setFeedback(error instanceof Error ? `启动审查失败：${error.message}` : "启动审查失败，请稍后重试");
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <PageStack>
      <PageToolbar className="contract-page-toolbar">
        <div>
          <div className="contract-eyebrow">合同专项审查</div>
          <h2>合同审查任务池</h2>
          <p>集中查看合同审查进度、风险报告和入库状态。</p>
        </div>
        <div className="contract-toolbar-actions">
          <button type="button" className="secondary" onClick={() => void loadTasks()} disabled={loading}>
            <RefreshCw size={14} /> 刷新
          </button>
          <button type="button" className="primary" onClick={() => void router.push(routes.contractReview)}>
            <Plus size={15} /> 上传合同
          </button>
        </div>
      </PageToolbar>
      <StatGrid className="contract-stats-row">
        <Surface><span>合同任务总数</span><strong>{counts.total}</strong><small>条款级专项审查记录</small></Surface>
        <Surface><span>待开始</span><strong>{counts.queued}</strong><small>等待人工启动审查</small></Surface>
        <Surface><span>审查中</span><strong>{counts.reviewing}</strong><small>系统正在生成分析</small></Surface>
        <Surface><span>待处理报告</span><strong>{counts.reported}</strong><small>需要人工确认风险</small></Surface>
      </StatGrid>
      <section className="contract-task-section">
        <div className="contract-task-toolbar">
          <div>
            <h3>全部合同任务</h3>
            <p>可按状态筛选，点击“开始审查”进入合同审查工作台。</p>
          </div>
          <label className="contract-filter-label">
            <span>任务状态</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as TaskFilter)}>
              <option value="all">全部状态</option>
              <option value="queued">待开始</option>
              <option value="reviewing">审查中</option>
              <option value="reported">报告已生成</option>
              <option value="stored">已入库</option>
            </select>
          </label>
        </div>
        <Surface className="contract-task-table-shell" aria-busy={loading}>
          <div className="contract-task-table-head">
            <span>合同文件</span><span>审查配置</span><span>检查模块</span><span>状态 / 时间</span><span>操作</span>
          </div>
          {loading ? <p className="table-empty">正在加载合同任务…</p> : null}
          {!loading && filteredTasks.length === 0 ? (
            <div className="contract-empty-state">
              <FileText size={24} />
              <strong>暂无符合条件的合同任务</strong>
              <span>上传一份合同开始审查流程。</span>
              <button type="button" className="secondary" onClick={() => void router.push(routes.contractReview)}>上传合同</button>
            </div>
          ) : null}
          {!loading && filteredTasks.map((task) => {
            const status = taskStatusMeta(task.status);
            return (
              <div className="contract-task-row" key={task.id}>
                <div className="contract-task-file">
                  <span className="contract-file-icon"><FileText size={18} /></span>
                  <span><strong>{task.name}</strong><small>{formatBytes(task.size)} · {formatDate(task.createdAt)}</small></span>
                </div>
                <div className="contract-task-config">
                  <Status tone="info">{contractReviewStanceLabels[task.stance]}</Status>
                  <small>{task.risks.length} 个待审查风险候选</small>
                </div>
                <div className="contract-task-modules">
                  {task.modules.slice(0, 3).map((moduleId) => <span key={moduleId}>{getContractReviewModuleLabel(moduleId)}</span>)}
                  {task.modules.length > 3 ? <span>+{task.modules.length - 3}</span> : null}
                </div>
                <div className="contract-task-status">
                  <Status tone={status.tone}>{status.label}</Status>
                  {task.status === "reviewing" ? <span className="contract-progress-mini"><i><b style={{ width: `${task.progress}%` }} /></i>{task.progress}%</span> : <small><Clock3 size={12} /> {formatDate(task.createdAt)}</small>}
                </div>
                <div className="contract-task-actions">
                  <button type="button" className={task.status === "queued" ? "primary" : "secondary"} disabled={busyTaskId === task.id} onClick={() => void openTask(task)}>
                    {busyTaskId === task.id ? <span className="button-spinner" aria-hidden="true" /> : task.status === "queued" ? <Play size={14} /> : <ArrowRight size={14} />}
                    {task.status === "queued" ? "开始审查" : task.status === "stored" ? "查看记录" : "进入工作台"}
                  </button>
                </div>
              </div>
            );
          })}
        </Surface>
        {feedback ? <p className="action-feedback error">{feedback}</p> : null}
      </section>
    </PageStack>
  );
}
