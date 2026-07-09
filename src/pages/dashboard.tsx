import Link from "next/link";
import { Layout } from "../components/Layout";

const metrics = [["已入库制度", "1,284"], ["已入库合同", "8,426"], ["已入库报告", "326"], ["已入库其他文件", "674"]];
const rows = [["制度", "10 项", "1 项", "2 项"], ["合同", "10 项", "1 项", "2 项"], ["报告", "10 项", "1 项", "2 项"]];

export default function Dashboard() {
  return (
    <Layout title="工作台" subtitle="治理概览、待处理文件与审查任务总览">
      <div className="metric-grid">{metrics.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><Link href="/knowledge">查看知识库</Link></div>)}</div>
      <div className="flow-panel">
        <h2>审查流程概览</h2>
        <div className="flow-row head"><span>类别 / 流程</span><span>待审查</span><span>审查中</span><span>已审查</span></div>
        {rows.map((row) => <div className="flow-row" key={row[0]}><strong>{row[0]}</strong>{row.slice(1).map((v, i) => <span key={i}><b>{v}</b><Link href={i ? "/review-task" : "/classification-task"}>{i ? "审查任务 →" : "分类任务 →"}</Link></span>)}</div>)}
      </div>
    </Layout>
  );
}
