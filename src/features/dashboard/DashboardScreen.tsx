import Link from "next/link";

import { routes } from "../../app";

const metrics = [
  ["已入库制度", "1,284"],
  ["已入库合同", "8,426"],
  ["已入库报告", "326"],
  ["已入库其他文件", "674"],
] as const;

const rows = [
  ["制度", "10 项", "1 项", "2 项"],
  ["合同", "10 项", "1 项", "2 项"],
  ["报告", "10 项", "1 项", "2 项"],
] as const;

export function DashboardScreen() {
  return (
    <>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <Link href={routes.knowledge}>查看知识库</Link>
          </div>
        ))}
      </div>
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
                  {index ? "审查任务 →" : "分类任务 →"}
                </Link>
              </span>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
