import {
  Archive,
  ArrowRight,
  BookOpenText,
  ClipboardList,
  FileText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { routes } from "../../app";
import type { DashboardOverview } from "../../app/services";
import { PageStack, StatGrid, Surface } from "../../shared/ui";

const metricIcons: readonly LucideIcon[] = [
  BookOpenText,
  FileText,
  ClipboardList,
  Archive,
];

const rows = [
  { category: "制度", pending: 2, reviewing: 1, reviewed: 5 },
  { category: "合同", pending: 2, reviewing: 2, reviewed: 2 },
  { category: "报告", pending: 1, reviewing: 1, reviewed: 3 },
] as const;

const flowColumns = [
  {
    id: "pending",
    label: "待审查",
    href: routes.classificationTasks,
    action: "分类任务池",
  },
  {
    id: "reviewing",
    label: "审查中",
    href: routes.reviewTasks,
    action: "审查任务池",
  },
  {
    id: "reviewed",
    label: "已审查",
    href: routes.reviewTasks,
    action: "审查任务池",
  },
] as const;

export interface DashboardScreenProps {
  readonly overview: DashboardOverview;
}

export function DashboardScreen({ overview }: DashboardScreenProps) {
  return (
    <PageStack className="dashboard-overview">
      <section className="dashboard-assets" aria-labelledby="dashboard-assets-title">
        <header className="dashboard-block-heading">
          <div>
            <h2 id="dashboard-assets-title">资产概览</h2>
            <p>查看已经正式入库的文件资产数量。</p>
          </div>
          <Link href={routes.knowledge}>
            查看知识库
            <ArrowRight size={14} />
          </Link>
        </header>
        <StatGrid className="metric-grid">
          {overview.metrics.map(({ label, value }, index) => {
            const MetricIcon = metricIcons[index % metricIcons.length] ?? Archive;
            return (
              <Surface className="metric-card" key={label}>
                <span className="metric-card-icon" aria-hidden="true">
                  <MetricIcon />
                </span>
                <span className="metric-card-label">{label}</span>
                <strong>{value}</strong>
              </Surface>
            );
          })}
        </StatGrid>
      </section>

      <Surface className="flow-panel dashboard-flow-panel">
        <header className="dashboard-flow-heading">
          <div>
            <h2>审查流程概览</h2>
            <p>按文件类别查看待审查、审查中和已审查任务。</p>
          </div>
        </header>
        <div className="flow-row head" role="row">
          <span role="columnheader">类别 / 流程</span>
          {flowColumns.map((column) => (
            <span role="columnheader" key={column.id}>{column.label}</span>
          ))}
        </div>
        {rows.map((row) => (
          <div className="flow-row" role="row" key={row.category}>
            <strong className="flow-category" role="rowheader">
              <span aria-hidden="true" />
              {row.category}
            </strong>
            {flowColumns.map((column) => (
              <Link
                className="flow-cell-link"
                href={column.href}
                role="cell"
                aria-label={`${row.category}${column.label}${row[column.id]}项，前往${column.action}`}
                key={column.id}
              >
                <b className="flow-count">
                  <strong>{row[column.id]}</strong>
                  <small>项</small>
                </b>
              </Link>
            ))}
          </div>
        ))}
      </Surface>
    </PageStack>
  );
}
