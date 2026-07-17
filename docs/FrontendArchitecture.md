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

文档数据使用带品牌的 `DocumentId`、`ClassificationCandidateId`、`ReviewTaskId`、`IsoDateTime`，并以 `DocumentState` 判别联合表示待处理、审查中、已审查、入库和软删除状态。审查进度限定在 `0–100`。

```text
getServerSideProps
  -> appServices.<业务服务>
  -> ClassificationWorkflowApi / TaskPoolApi / KnowledgeApi / DocumentRepository
  -> 共享 Mock Store（默认）/ src/infrastructure/http（真实后端）
  -> feature table
  -> shared DataGrid
```

列表接口原生包含分页、搜索、筛选、排序和 `AbortSignal`。分类、审查、知识库分别配置自己的列与动作，通用 `DataGrid<T>` 只负责渲染和异步状态。对话框状态始终携带目标实体 ID；审查报告使用 `/review-tasks/[taskId]/report` 深链。

当前 `appServices` 默认绑定认证、工作台、文件分类、分类任务池、审查任务池、知识库和智能问答的 Mock adapter。`src/infrastructure/http` 已提供同端口的 HTTP Adapter、统一错误、预签名上传、轻量响应校验和轮询工具。页面写操作通过应用服务注入，并使用 `idempotencyKey`、`expectedVersion`、`If-Match` 和逐项批量结果表达真实后端语义。

后端实施依据：

- `docs/BackendApiContract.md`：业务语义、端点表和状态流转；
- `openapi/proofspace.yaml`：机器可读 OpenAPI 3.1 契约；
- `src/infrastructure/http`：前端请求映射。

浏览器页面使用 `createBrowserHttpAppServices()`；`getServerSideProps` 必须按请求
调用 `createServerHttpAppServices()` 并转发 Cookie，不能复用服务端全局认证实例。

## 响应式与性能

- 当前产品以桌面端为主要使用场景和验收范围。现有窄屏样式作为安全降级保留，
  不单独扩展移动端业务流程、卡片任务列表或触屏专用操作模型。
- 桌面保留侧栏，后台内容区使用全宽自适应布局，不人为保留大块右侧空白。
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
- IconButton 必须同时具备 `aria-label` 和 `title`，默认 `type="button"`。
- 文件分类候选表使用紧凑图标操作；分类任务池、审查任务池和知识库将主要流程
  动作显示为文字按钮，预览、删除等次要动作收进“更多操作”菜单。
- 窄屏降级下仍保证交互控件有足够命中区域，但当前不把移动端作为独立产品形态验收。
- Pagination 是受控组件，必须传真实页数和回调。
- 移动侧栏打开时锁定页面滚动，并提供可键盘操作的关闭按钮和遮罩。
- 所有关键资源操作必须携带稳定实体 ID。

## 当前明确限制

- `demoSession` 只是认证 port 的组合占位，不是权限保护；正式接入前不能把 403 页面视作鉴权实现。
- 当前所有业务服务仍是进程内 Mock，不具备跨实例持久化、真实鉴权或事务保证。
- 文档预览当前返回文本内容；真实 PDF/DOCX 在线预览仍需后端转换服务或受控预览地址。
- HTTP Adapter 已做关键字段的轻量运行时校验；后续可由 OpenAPI 生成完整客户端与 Schema 校验器。
- 轮询工具已经存在，但尚未接入业务页面；页面不可见暂停和 `Retry-After` 处理也未完成。
- 报告文件导出未纳入 V1 OpenAPI，在后端提供真实文件产物前继续隐藏入口。

## 验证

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

核心测试覆盖模块/路由重复校验、URL 编码、领域 ID/时间/进度、完整操作矩阵、候选筛选分页、批量部分失败、人工覆盖 AI、终止报告、知识删除级联，以及 repository 的分页、筛选、排序和取消。

## 视觉基准

- 背景 `#F6F1E8`
- 卡片 `#FFFFFF`
- 主色 `#B87333`
- 侧栏 `#3C3C39`
- 边框 `#E5DED2`
- 危险色 `#C94A3A`
- 状态胶囊固定宽 `112px`
- 文件分类候选表使用紧凑图标按钮；任务池主要操作使用文字按钮，次要操作使用“更多操作”菜单
