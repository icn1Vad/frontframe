import { Layout } from "../components/Layout";
import { DataTable } from "../components/DataTable";
import { reviewRows } from "../data/mock";

export default function ReviewTask() {
  return <Layout title="文件分类审查 / 审查任务" subtitle="跟踪审查进度、查看报告，并处理审查后的入库动作"><DataTable kind="review" rows={reviewRows} /></Layout>;
}
