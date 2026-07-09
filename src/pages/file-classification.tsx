import { Check, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { IconButton, Modal, Pagination, Status } from "../components/Ui";
import { statusTone, uploadRows } from "../data/mock";

type Stage = "empty" | "pending" | "confirm";

export default function FileClassification() {
  const [stage, setStage] = useState<Stage>("empty");
  const [modal, setModal] = useState<"upload" | "preview" | null>(null);
  const [files, setFiles] = useState(uploadRows);

  const choose = () => setStage("pending");
  if (stage === "empty") {
    return <Layout title="文件分类审查 / 文件分类" subtitle="上传并识别文件类型、分类和层级">
      <div className="upload-panel">
        <h2>上传待分类文件</h2><p>系统会生成推荐类型、推荐分类、文件层级和人工确认状态。</p>
        <button className="dropzone" onClick={choose}><span className="plus-circle"><Plus /></span><strong>拖拽文件到这里，或点击选择文件</strong><small>支持 PDF / DOCX / XLSX / TXT，最大50M</small><span className="secondary">选择文件</span></button>
      </div>
    </Layout>;
  }

  if (stage === "pending") {
    return <Layout title="文件分类审查 / 文件分类" subtitle="文件已拖入，确认上传前可预览、删除或继续添加">
      <div className="pending-panel">
        <h2>待上传文件</h2><p>文件已拖入，尚未提交。确认上传后进入分类中，完成识别后进入待人工确认。</p>
        <div className="pending-grid">
          <button className="pending-drop" onClick={() => setModal("upload")}><span className="plus-circle"><Plus /></span><strong>继续拖拽文件到这里</strong><small>支持 PDF / DOCX / XLSX / TXT，最大50M</small><span className="secondary">继续添加文件</span></button>
          <div className="pending-list">
            <div className="pending-head"><span>文件名</span><span>大小 / 类型</span><span>状态</span><span>操作</span></div>
            {files.map((file, index) => <div className="pending-row" key={file[0]}><span><FileText size={17} />{file[0]}</span><span>{file[1]}</span><Status>待上传</Status><span className="actions"><IconButton label="预览" onClick={() => setModal("preview")}><Eye /></IconButton><IconButton label="删除" onClick={() => setFiles(files.filter((_, i) => i !== index))}><Trash2 /></IconButton></span></div>)}
          </div>
        </div>
        <div className="pending-footer"><p>上传前可预览文件并删除错误文件；删除全部不会影响已上传记录。</p><button className="secondary" onClick={() => setFiles([])}>删除全部</button><button className="primary" onClick={() => setStage("confirm")}>确认上传</button></div>
      </div>
      {modal === "upload" && <UploadModal onClose={() => setModal(null)} onConfirm={() => { setModal(null); setStage("confirm"); }} />}
      {modal === "preview" && <PreviewModal onClose={() => setModal(null)} />}
    </Layout>;
  }

  const confirmRows = [
    ["采购管理办法（修订稿）.docx", "制度文件", "公司级", "招标采购", "待确认"],
    ["XX项目合同.pdf", "合同文件", "部门级", "合同文件", "待确认"],
    ["年度合规报告.pdf", "报告文件", "公司级", "供应链", "分类中"],
    ["法律法规汇编.pdf", "其他文件", "外部规范文件", "外部规范", "待确认"],
  ];
  return <Layout title="文件分类审查 / 文件分类" subtitle="确认 AI 分类结果后，文件进入分类任务待处理状态">
    <div className="stats-row"><div><span>待分类总文件</span><strong>5</strong></div><div><span>分类中</span><strong>3</strong></div><div><span>待确认</span><strong>2</strong></div><button className="secondary" onClick={() => setModal("upload")}>继续上传</button></div>
    <div className="confirm-table"><div className="confirm-head"><span>文件名称</span><span>文件类型</span><span>文件层级</span><span>文件分类</span><span>人工确认</span><span>操作</span></div>
      {confirmRows.map((row) => <div className="confirm-row" key={row[0]}>{row.slice(0,4).map((v, i) => i === 0 ? <input key={`${i}-${v}`} defaultValue={v} /> : <select key={`${i}-${v}`} defaultValue={v}><option>{v}</option></select>)}<Status tone={statusTone(row[4])}>{row[4]}</Status><span className="actions"><IconButton label="预览" onClick={() => setModal("preview")}><Eye /></IconButton><IconButton label="确认"><Check /></IconButton><IconButton label="删除" danger><Trash2 /></IconButton></span></div>)}
    </div><Pagination />
    {modal === "upload" && <UploadModal onClose={() => setModal(null)} onConfirm={() => setModal(null)} />}
    {modal === "preview" && <PreviewModal onClose={() => setModal(null)} />}
  </Layout>;
}

function UploadModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return <Modal title="继续上传文件" subtitle="拖入后先进入待上传队列，点击确认上传后进入文件分类。" onClose={onClose}><button className="modal-drop"><span className="plus-circle"><Plus /></span><strong>拖入新文件，或点击加号选择电脑中的文件</strong><small>支持 PDF / DOCX / XLSX / TXT，最大50M</small><span className="secondary">继续添加</span></button><p className="modal-note">上传成功后，文件进入分类中；AI 分类完成后自动出现在待人工确认列表。</p><div className="modal-actions"><button className="secondary">删除全部</button><button className="primary" onClick={onConfirm}>确认上传</button></div></Modal>;
}

function PreviewModal({ onClose }: { onClose: () => void }) {
  return <Modal title="文件预览" subtitle="只读查看文件内容，不允许编辑原文件。" onClose={onClose}><div className="preview"><h3>采购管理办法（修订稿）</h3><p>第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。</p></div></Modal>;
}
