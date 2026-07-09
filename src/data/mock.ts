export const classificationRows = [
  ["采购管理办法.docx", "制度文件", "公司级", "招标采购", "待处理", "07-05 10:24", "严凯丰"],
  ["XX项目合同.pdf", "合同文件", "部门级", "合同文件", "已分类入库", "07-05 10:30", "严凯丰"],
  ["供应商说明.pdf", "报告文件", "公司级", "供应链", "已进入审查", "07-05 10:41", "严凯丰"],
  ["旧版制度.docx", "制度文件", "公司级", "行政管理", "已删除", "07-04 15:08", "李四"],
];

export const reviewRows = [
  ["采购管理办法.docx", "制度文件", "公司级", "招标采购", "审查中", "30%", "严凯丰"],
  ["供应商管理制度.docx", "制度文件", "公司级", "供应链", "已审查", "07-05 12:08", "严凯丰"],
  ["XX项目合同.pdf", "合同文件", "部门级", "合同文件", "已审查入库", "07-04 18:20", "严凯丰"],
  ["旧版制度.docx", "制度文件", "公司级", "行政管理", "已删除", "07-04 15:08", "严凯丰"],
];

export const knowledgeRows = [
  ["采购管理办法.docx", "制度文件", "公司级", "招标采购", "已审查入库", "07-05 14:40", "严凯丰"],
  ["XX项目合同.pdf", "合同文件", "部门级", "合同文件", "已分类入库", "07-05 10:30", "严凯丰"],
  ["法律法规汇编.pdf", "其他文件", "外部规范文件", "外部规范", "已分类入库", "07-04 10:18", "严凯丰"],
];

export const uploadRows = [
  ["采购管理办法.docx", "DOCX · 1.2MB"],
  ["XX项目合同.pdf", "PDF · 3.4MB"],
  ["年度合规报告.pdf", "PDF · 2.8MB"],
  ["供应商说明.txt", "TXT · 36KB"],
];

export function statusTone(status: string) {
  if (status.includes("删除") || status.includes("风险")) return "danger";
  if (status.includes("入库") || status === "待确认") return "success";
  if (status.includes("审查中") || status.includes("进入审查")) return "info";
  if (status === "已审查") return "neutral";
  return "warning";
}
