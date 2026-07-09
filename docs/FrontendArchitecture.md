# ProofSpace 前端结构

## 技术栈

- Next.js 15 Pages Router
- React 19
- TypeScript
- 原生 CSS 与 CSS Variables
- Lucide React 图标

## 页面结构

所有业务页使用统一的 `Layout`，固定由 `220px Sidebar + 74px Header + Content` 组成。页面视觉基准为 Figma 的 `1600 x 900` 画板，内容区在更小视口允许横向滚动，避免表格列被任意折叠。

```mermaid
flowchart LR
  Login["登录 / 注册"] --> Dashboard["工作台"]
  Dashboard --> Upload["文件分类"]
  Upload --> Pending["待上传"]
  Pending --> Confirm["待人工确认"]
  Confirm --> Classification["分类任务"]
  Classification --> Review["审查任务"]
  Review --> Report["审查报告"]
  Report --> Knowledge["知识库"]
  Knowledge --> Chat["智能问答"]
```

## 目录

- `src/components/Layout.tsx`: 统一侧栏与顶栏
- `src/components/Ui.tsx`: 状态、图标按钮、分页、浮窗
- `src/components/DataTable.tsx`: 三类业务表格
- `src/data/mock.ts`: Figma 演示数据
- `src/pages`: 页面路由
- `src/styles/globals.css`: Design System 和页面样式

## Figma 约束

- 背景 `#F6F1E8`
- 卡片 `#FFFFFF`
- 主色 `#B87333`
- 侧栏 `#3C3C39`
- 边框 `#E5DED2`
- 危险色 `#C94A3A`
- 状态胶囊固定宽 `112px`
- 表格操作只使用 `32px` 图标按钮
- 上传严格经过 `未上传 -> 待上传 -> 分类中 -> 待人工确认`
