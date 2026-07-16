import {
  ArrowRight,
  FileCheck2,
  FilePlus2,
  Files,
  FolderSearch,
  Library,
  ListChecks,
  Scale,
} from "lucide-react";
import Link from "next/link";

import { routes } from "../../app";
import type { DashboardOverview } from "../../app/services";
import { PageStack, PageToolbar, StatGrid, Surface } from "../../shared/ui";

type DashboardTodo = DashboardOverview["todos"][number];
type DashboardTodoKind = DashboardTodo["kind"];

const todoPresentation: Record<
  DashboardTodoKind,
  {
    readonly label: string;
    readonly description: string;
    readonly action: string;
    readonly href: string;
  }
> = {
  "classification-confirmation": {
    label: "待确认分类",
    description: "智能分类已经生成，需要人工确认最终结果。",
    action: "立即处理",
    href: `${routes.fileClassification}?status=awaiting-confirmation`,
  },
  "classification-task": {
    label: "待处理分类任务",
    description: "选择直接入库，或者进入后续审查流程。",
    action: "进入任务池",
    href: routes.classificationTasks,
  },
  "review-progress": {
    label: "审查中",
    description: "查看正在执行的审查任务和当前进度。",
    action: "查看进度",
    href: routes.reviewTasks,
  },
  "review-report": {
    label: "待处理审查报告",
    description: "审查已经完成，需要查看报告并处理风险项。",
    action: "查看报告",
    href: routes.reviewTasks,
  },
  "contract-review": {
    label: "合同专项任务",
    description: "查看条款级合同专项审查和待处理报告。",
    action: "查看专项任务",
    href: routes.contractReviewTasks,
  },
};

const quickEntries = [
  {
    label: "上传并分类",
    description: "上传企业文件并确认智能分类建议。",
    href: routes.fileClassification,
    icon: FilePlus2,
  },
  {
    label: "分类任务池",
    description: "处理已确认分类文件的入库或审查去向。",
    href: routes.classificationTasks,
    icon: Files,
  },
  {
    label: "审查任务池",
    description: "跟踪审查进度，查看和处理风险报告。",
    href: routes.reviewTasks,
    icon: ListChecks,
  },
  {
    label: "知识库",
    description: "查看已经正式入库的企业文件资产。",
    href: routes.knowledge,
    icon: Library,
  },
] as const;

export interface DashboardScreenProps {
  readonly overview: DashboardOverview;
}

export function DashboardScreen({ overview }: DashboardScreenProps) {
  return (
    <PageStack className="dashboard-page">
      <section className="dashboard-section" aria-labelledby="dashboard-todos">
        <PageToolbar className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-todos">我的待办</h2>
            <p>优先处理会影响文件流转和正式入库的任务。</p>
          </div>
          <span className="dashboard-total">
            共 {overview.todos.reduce((total, todo) => total + todo.count, 0)} 项
          </span>
        </PageToolbar>
        <Surface className="dashboard-todo-list">
          {overview.todos.map((todo) => {
            const presentation = todoPresentation[todo.kind];
            return (
              <article className="dashboard-todo-row" key={todo.kind}>
                <span className="dashboard-todo-icon" aria-hidden="true">
                  <FileCheck2 />
                </span>
                <div className="dashboard-todo-copy">
                  <strong>{presentation.label}</strong>
                  <p>{presentation.description}</p>
                </div>
                <strong className="dashboard-todo-count">{todo.count} 项</strong>
                <Link className="secondary dashboard-todo-action" href={presentation.href}>
                  {presentation.action}
                  <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </Surface>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-quick-entry">
        <PageToolbar className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-quick-entry">快捷入口</h2>
            <p>从常用操作直接进入对应处理页面。</p>
          </div>
        </PageToolbar>
        <div className="dashboard-quick-grid">
          {quickEntries.map((entry) => {
            const EntryIcon = entry.icon;
            return (
              <Link className="dashboard-quick-card" href={entry.href} key={entry.label}>
                <span aria-hidden="true"><EntryIcon /></span>
                <strong>{entry.label}</strong>
                <p>{entry.description}</p>
                <ArrowRight className="dashboard-quick-arrow" size={16} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <Surface className="dashboard-contract-entry">
          <span className="dashboard-contract-icon" aria-hidden="true"><Scale /></span>
          <div>
            <strong>合同专项审查</strong>
            <p>直接上传合同，验证条款解析、风险定位和修订能力。</p>
          </div>
          <Link className="secondary" href={routes.contractReview}>
            上传合同
            <ArrowRight size={14} />
          </Link>
          <Link className="dashboard-contract-tasks" href={routes.contractReviewTasks}>
            查看专项任务
            <FolderSearch size={14} />
          </Link>
        </Surface>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-assets">
        <PageToolbar className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-assets">资产概览</h2>
            <p>查看当前已经正式入库的文件资产。</p>
          </div>
          <Link className="dashboard-heading-link" href={routes.knowledge}>
            查看知识库
            <ArrowRight size={14} />
          </Link>
        </PageToolbar>
        <StatGrid className="metric-grid">
          {overview.metrics.map(({ label, value }) => (
            <Surface className="metric-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </Surface>
          ))}
        </StatGrid>
      </section>
    </PageStack>
  );
}
