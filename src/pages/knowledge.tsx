import { DataTable, KnowledgeToolbar } from "../components/DataTable";
import { Layout } from "../components/Layout";
import { knowledgeRows } from "../data/mock";

export default function Knowledge() {
  return <Layout title="知识库" subtitle="查看已分类入库和已审查入库的正式文件资产"><KnowledgeToolbar /><DataTable kind="knowledge" rows={knowledgeRows} /></Layout>;
}
