import { Layout } from "../components/Layout";
import { DataTable } from "../components/DataTable";
import { classificationRows } from "../data/mock";

export default function ClassificationTask() {
  return <Layout title="文件分类审查 / 分类任务" subtitle="管理分类完成后的文件，处理入库、审查或删除等后续操作"><DataTable kind="classification" rows={classificationRows} /></Layout>;
}
