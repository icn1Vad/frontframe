import { FileText, FolderArchive, ListChecks, Search, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { FilterLabel, IconButton, Modal, Pagination, Status } from "./Ui";
import { statusTone } from "../data/mock";

type Kind = "classification" | "review" | "knowledge";

export function DataTable({ kind, rows }: { kind: Kind; rows: string[][] }) {
  const [dialog, setDialog] = useState<"preview" | "delete" | "progress" | null>(null);
  const headers = kind === "review"
    ? ["文件名称", "文件类型", "文件层级", "文件分类", "状态", "审查进度 / 时间", "审查执行人", "操作"]
    : ["文件名称", "文件类型", "文件层级", "文件分类", "状态", kind === "knowledge" ? "入库时间" : "分类时间", kind === "knowledge" ? "入库执行人" : "分类执行人", "操作"];

  return (
    <>
      <div className={`data-table ${kind}`}>
        <div className="table-row table-head">{headers.map((h) => <FilterLabel key={h}>{h}</FilterLabel>)}</div>
        {rows.map((row) => <div className="table-row" key={row[0]}>
          <strong className="file-name"><FileText size={17} />{row[0]}</strong>
          <span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span>
          <Status tone={statusTone(row[4])}>{row[4]}</Status>
          {kind === "review" && row[5].includes("%") ? <span className="review-progress"><i><b style={{ width: row[5] }} /></i>{row[5]}</span> : <strong>{row[5]}</strong>}
          <strong>{row[6]}</strong>
          <span className="actions">
            {kind === "classification" && <>
              <IconButton label="查看" onClick={() => setDialog("preview")}><Eye /></IconButton>
              {row[4] === "待处理" && <><IconButton label="入库"><FolderArchive /></IconButton><IconButton label="审查"><ListChecks /></IconButton><IconButton label="删除" onClick={() => setDialog("delete")} danger><Trash2 /></IconButton></>}
            </>}
            {kind === "review" && <>
              <IconButton label={row[4] === "审查中" ? "查看进度" : "查看报告"} onClick={() => setDialog(row[4] === "审查中" ? "progress" : "preview")}><ListChecks /></IconButton>
              {(row[4] === "审查中" || row[4] === "已审查") && <IconButton label="删除" onClick={() => setDialog("delete")} danger><Trash2 /></IconButton>}
              {row[4] === "已审查" && <IconButton label="入库"><FolderArchive /></IconButton>}
            </>}
            {kind === "knowledge" && <>
              <IconButton label={row[4].includes("审查") ? "查看报告" : "预览"} onClick={() => setDialog("preview")}>{row[4].includes("审查") ? <ListChecks /> : <Eye />}</IconButton>
              <IconButton label="删除" onClick={() => setDialog("delete")} danger><Trash2 /></IconButton>
            </>}
          </span>
        </div>)}
        {Array.from({ length: kind === "knowledge" ? 6 : 7 }).map((_, i) => <div className="blank-row" key={i} />)}
      </div>
      <Pagination />
      {dialog === "delete" && <Modal title="确认删除" subtitle="删除为软删除，保留记录方便溯源。" onClose={() => setDialog(null)}><p className="dialog-copy">删除后对象将从当前可操作列表移除，并在对应任务记录中显示“已删除”。</p><div className="modal-actions"><button className="secondary">删除</button><button className="primary" onClick={() => setDialog(null)}>取消</button></div></Modal>}
      {dialog === "preview" && <Modal title="文件预览" subtitle="只读查看文件内容，不允许编辑原文件。" onClose={() => setDialog(null)}><div className="preview"><h3>采购管理办法（修订稿）</h3><p>第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议。</p></div></Modal>}
      {dialog === "progress" && <Modal title="审查进度" subtitle="展示语义检测、冲突检测、一致性检测当前进度。" onClose={() => setDialog(null)}><div className="progress-list">{[["语义检测",100,"完成"],["冲突检测",30,"30%"],["一致性检测",0,"等待中"]].map(([name, value, text]) => <div key={String(name)}><span>{name}</span><i><b style={{width: `${value}%`}} /></i><span>{text}</span></div>)}</div></Modal>}
    </>
  );
}

export function KnowledgeToolbar() {
  return <div className="knowledge-toolbar"><label><Search size={16} /><input placeholder="搜索文件名称 / 类型 / 状态" /></label><div><button className="primary">经典视图</button><button className="secondary">图形视图</button></div></div>;
}
