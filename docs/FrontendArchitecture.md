# ProofSpace 前端架构

## 结论

当前继续使用 Next.js 15 Pages Router。现阶段没有独立部署、第三方运行时代码或版本隔离需求，因此不引入 App Router 迁移、Module Federation 或微前端。模块化采用编译期 manifest 和稳定端口：它能降低新增业务模块和替换后端适配器的成本，但不会在运行时自动创建 Next.js 路由。

## 技术栈

- Next.js 15 Pages Router
- React 19
- TypeScript strict mode
- 原生 CSS、CSS Variables
- Lucide React
- Vitest

## 分层与依赖方向

```text
src/
  app/                    # 组合根、AppShell、模块清单、typed routes、服务绑定
  features/               # 领域模型、应用端口、适配器、feature screens
    documents/
      domain/
      application/
      infrastructure/
      presentation/
  pages/                  # 仅做 Next 路由和 SSR 数据装配
  shared/                 # 无业务语义的 UI、DataGrid 和小型工具
  styles/
```

依赖规则：

1. `pages` 只负责 Next.js 路由、查询参数和服务端数据装配。
2. `app` 是组合根，可绑定 feature 定义的 port 与具体 adapter。
3. `features` 可以依赖 `shared`；`shared` 不依赖任何 feature。
4. 领域逻辑使用状态码、稳定 ID 和判别联合，不以数组下标或中文展示文案驱动。
5. 后端接入点集中在 repository/command adapter，不在页面或通用组件中直接 `fetch`。

## 应用壳与模块接口

`src/app/module-registry.ts` 定义 `FrontendModuleV1`。每个模块声明：

- `apiVersion`、稳定 `id` 和 Pages Router 路径；
- 页面标题与副标题；
- 可选导航位置、顺序和 `prefetch` 策略；
- 所需权限元数据。

registry 在启动时拒绝重复模块 ID、重复路径和不存在的导航分组。`_app.tsx` 根据页面的 `pageConfig` 复用一个 `AppShell`，因此切换业务页面时侧栏和顶栏不会随页面组件一同卸载。

新增模块时：

1. 在 `features/<module>` 建立公开出口；
2. 在 `pages` 添加薄路由文件；
3. 在 `coreModules` 添加 manifest；
4. 使用 `src/app/routes.ts` 暴露固定路径或带 ID 的 route builder；
5. 为 registry、route builder 和关键状态转换补测试。

如果将来确实需要运行时第三方插件，需要单独设计 catch-all 宿主页、版本协议、权限、CSS 隔离和故障边界；当前 manifest 不承诺这些能力。

## 文档领域与数据连接

文档数据使用带品牌的 `DocumentId`、`ReviewTaskId`、`IsoDateTime`，并以 `DocumentState` 判别联合表示待处理、审查中、已审查、入库和删除状态。审查进度限定在 `0–100`。

```text
getServerSideProps
  -> appServices.documents
  -> DocumentRepository port
  -> mockDocumentRepository（当前）/ HTTP adapter（未来）
  -> feature table
  -> shared DataGrid
```

列表接口原生包含分页、搜索、筛选、排序和 `AbortSignal`。分类、审查、知识库分别配置自己的列与动作，通用 `DataGrid<T>` 只负责渲染和异步状态。对话框状态始终携带目标实体 ID；审查报告使用 `/review-tasks/[taskId]/report` 深链。

当前 `appServices` 绑定只读 mock repository。写操作通过 `commands`/`onDelete` 注入；接入后端前，相关表格按钮会禁用而不是执行无目标的假操作。

## 响应式与性能

- 桌面保留 220px 侧栏，内容最大宽度 1380px。
- `<= 1200px` 缩窄侧栏并调整多列布局。
- `<= 900px` 使用抽屉侧栏，报告、聊天、上传和认证布局降列。
- `<= 640px` 使用紧凑边距和单列卡片。
- 宽表格只在自身容器横向滚动，不扩大整个 document 的 `scrollWidth`。
- 列表由 repository 分页；不要把数百/数千行全部 SSR 后再用 CSS 隐藏。

构建护栏建议：

- First Load JS `<= 120 kB`；
- 单路由新增客户端 JS `< 40 kB gzip`；
- 全局 CSS `<= 10 kB gzip`；
- 引入 PDF、DOCX、图表或编辑器时按点击路径动态加载，并重新测量导航预取成本。

## 可访问性与交互约束

- Modal 提供 ARIA 标注、Escape 关闭、初始焦点和焦点恢复。
- IconButton 必须有可读标签，默认 `type="button"`。
- Pagination 是受控组件，必须传真实页数和回调。
- 移动侧栏打开时锁定页面滚动，并提供可键盘操作的关闭按钮和遮罩。
- 所有关键资源操作必须携带稳定实体 ID。

## 当前明确限制

- `demoSession` 只是认证 port 的组合占位，不是权限保护；正式接入前不能把 403 页面视作鉴权实现。
- repository 当前是 mock；入库、开始审查、删除等写命令尚未绑定后端。
- 文档预览、知识图谱视图和报告导出保留了 UI 接口，但真实适配器尚未实现。
- TypeScript 不能校验网络响应；HTTP adapter 应加入运行时 schema 校验。

## 验证

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

核心测试覆盖模块/路由重复校验、URL 编码、领域 ID/时间/进度、状态映射，以及 repository 的分页、筛选、排序、取消和审查任务查找。

## 视觉基准

- 背景 `#F6F1E8`
- 卡片 `#FFFFFF`
- 主色 `#B87333`
- 侧栏 `#3C3C39`
- 边框 `#E5DED2`
- 危险色 `#C94A3A`
- 状态胶囊固定宽 `112px`
- 表格操作使用 `32px` 图标按钮
