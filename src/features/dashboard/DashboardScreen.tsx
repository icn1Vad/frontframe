import Link from "next/link";

import { routes } from "../../app";
import type { DashboardOverview } from "../../app/services";
import { PageStack, StatGrid } from "../../shared/ui";

const rows = [
  ["制度", "10 项", "1 项", "2 项"],
  ["合同", "10 项", "1 项", "2 项"],
  ["报告", "10 项", "1 项", "2 项"],
] as const;

export interface DashboardScreenProps {
  readonly overview: DashboardOverview;
}

export function DashboardScreen({ overview }: DashboardScreenProps) {
  return (
    <PageStack>
      <StatGrid className="metric-grid">
        {overview.metrics.map(({ label, value }) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <Link href={routes.knowledge}>查看知识库</Link>
          </div>
        ))}
      </StatGrid>
      <div className="flow-panel">
        <h2>审查流程概览</h2>
        <div className="flow-row head">
          <span>类别 / 流程</span>
          <span>待审查</span>
          <span>审查中</span>
          <span>已审查</span>
        </div>
        {rows.map((row) => (
          <div className="flow-row" key={row[0]}>
            <strong>{row[0]}</strong>
            {row.slice(1).map((value, index) => (
              <span key={index}>
                <b>{value}</b>
                <Link
                  href={
                    index ? routes.reviewTasks : routes.classificationTasks
                  }
                >
                  {index ? "审查任务池 →" : "分类任务池 →"}
                </Link>
              </span>
            ))}
          </div>
        ))}
      </div>
    </PageStack>
  );
}
