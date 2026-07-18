# ProofSpace 前端问题复盘、Java 接口与联调边界

更新时间：2026-07-18

对应前端基线：`9e9fd41`

前端部署：`https://proofreading.cortexdata.cn`
Java 目标：`continew-java:18000`

## 1. 先回答三个核心问题

### 1.1 之前的问题为什么会出现

之前看到的现象并不是同一个故障，至少分成了四类：

1. **前端调用错误**：浏览器原生 `fetch` 被保存后以错误的接收者调用，触发 `Illegal invocation`。这个问题已经在前端修复。
2. **部署或路由错误**：本地 `127.0.0.1:13001` 没有服务监听，以及 Gateway 曾把 `/dashboard*` 转发给 Java。这类问题发生在请求到达业务 Controller 以前。
3. **历史 Token 被 Java 权限拒绝**：创建提问集和上传合同的请求到达了 `continew-java:18000`，但当时所用 Token 返回 HTTP 403；后续使用全新 admin Token 已验证同样两个 POST 均返回 200。
4. **上游失败造成的连锁现象**：合同文件上传失败后没有 `fileId`，所以前端不会创建合同任务，任务池自然没有新任务；会话创建失败后没有 `conversationId`，所以无法继续测试历史消息和 SSE。

把所有现象都概括成“前后端没接上”是不准确的。当前网络链路和 Java 超级管理员写权限均已验证正常，当前最明确的前端缺口是没有通过 `/auth/user/info` 校验 Token 身份，也没有用真实用户资料驱动页面身份展示。

### 1.2 前端能不能解决 Java 权限或安全策略

**不能，也不应该绕过。**

前端可以修复的安全相关问题只有：

- 是否使用登录返回的真实 Token；
- 是否携带 `Authorization: Bearer <token>`；
- 请求方法、路径和请求体是否正确；
- 写请求是否携带 `Idempotency-Key`；
- 401/403 是否显示清晰错误并保留 Trace ID。

前端不能修改或伪造：

- Java Controller 或 Service 上的权限注解；
- `sys_menu` 中的权限标识；
- `sys_role_menu` 中的角色授权关系；
- Java 安全过滤器、租户上下文和权限缓存；
- 用户、租户、部门、角色等身份字段。

前端仍不能绕过真正的 Java 权限策略。但是本次使用全新 admin Token 调用 `/auth/user/info`，已经确认 `roles: ["super_admin"]`、`permissions: ["*:*:*"]`，随后创建会话和上传文件均成功。因此当前不应继续要求 Java 为 admin 增加权限；应先修复前端登录后的身份校验和旧 Token 清理闭环。

### 1.3 接下来修改方向

推荐按以下顺序推进：

1. **前端先补认证闭环**：成功登录后立即调用 `GET /auth/user/info`；失败时清除 Token，成功时保存并展示真实身份。
2. **用户重新登录**：主动清除旧 `proofspace_access_token`，重新使用 admin 登录并确认身份接口返回超级管理员。
3. **前端改善诊断**：区分上传失败和任务创建失败，将状态码、Java 消息和 Trace ID 展示出来。
4. **使用新 Token 完成真实链路测试**：文件上传 → 取得 `fileId` → 创建任务 → 轮询 → 结果；创建会话 → 历史消息 → SSE。
5. **最后替换剩余 Mock**：只在 Java 给出明确契约后接分类、知识库、工作台统计和合同风险写回，不由前端猜接口。

## 2. 历史问题逐项复盘

| 过去的现象 | 请求实际停在哪里 | 根因判断 | 当前状态 | 责任侧 |
| --- | --- | --- | --- | --- |
| 验证码加载失败：`Illegal invocation` | 浏览器发出请求前 | `fetch` 脱离 `globalThis` 调用，属于前端原生 API 调用错误 | 已修复，并有单元测试防回归 | 前端 |
| 输入验证码后登录显示 `Forbidden` | 登录代理或 Java `/auth/login` | 说明请求已经发出；当时未保留足够的响应体和 Trace 证据，不能把它和当前业务 403 视为同一根因 | 后续已能成功登录；若复现需按 Trace 重新查 | Java 认证配置/请求契约，需联合确认 |
| `127.0.0.1:13001` 拒绝连接 | 浏览器连接宿主机端口 | 当时端口没有服务监听或前端容器未处于可访问状态，不是业务接口权限 | 当前正式域名可访问 | 部署 |
| 登录后 `/dashboard` 打开异常 | Gateway 路由选择 | `/dashboard*` 曾被误放进 Java 路由匹配，页面请求没有交给 Next.js | 已从 Java 路由中移除 | Gateway |
| 点击新建提问集没有新对话 | 第一阶段曾有前端会话插入/选中问题；历史 Token 又在 Java POST 返回 403 | 前端展示逻辑已在 `9e9fd41` 修复；新 admin Token 已能成功创建 | 待浏览器清 Token 后复测 | 前端身份闭环 |
| 创建提问集失败：`请求失败`/`Forbidden` | `POST /business/chat/conversations` | 历史 Token 返回 HTTP 403；全新 admin Token 对同一接口已返回 200 | 旧问题待浏览器重新登录复测 | 前端Token身份闭环优先排查 |
| 上传合同后开始审查失败 | `POST /business/documents` | 历史 Token 返回 HTTP 403；全新 admin Token 上传已返回 200 和 `fileId` | 旧问题待浏览器重新登录复测 | 前端Token身份闭环优先排查 |
| 合同任务池没有任务 | 尚未调用合同任务创建接口 | 上传失败，没有 `fileId`，前端按正确顺序停止第二步 | 符合当前程序逻辑 | 上游权限问题的结果 |
| 无法继续测试智能问答 | 尚未取得 `conversationId` | 创建会话失败，历史消息和 SSE 没有合法会话上下文 | 符合当前程序逻辑 | 上游权限问题的结果 |

关于旧登录 `Forbidden`，目前只能确认“请求已到达服务端安全链路”，不能仅凭截图确定是验证码错误、客户端配置、登录白名单还是其他安全规则。这里必须保留这个不确定性，避免后端按错误方向修改权限。

## 3. 当前链路与现场证据

当前前端没有再把业务请求发送到旧 ProofSpace Java。浏览器使用同源相对路径请求，Gateway 再转发给 `continew-java:18000`：

```text
浏览器 https://proofreading.cortexdata.cn
  ├─ /business/**
  │    └─ Caddy → continew-java:18000
  ├─ /api/continew/captcha/image
  │    └─ Next.js API Route → continew-java:18000/captcha/image
  └─ /api/continew/auth/login
       └─ Next.js API Route → continew-java:18000/auth/login
```

2026-07-18 09:15 左右使用当时浏览器 Token 的现场验证结果：

| 请求 | 结果 | Trace ID | 说明 |
| --- | --- | --- | --- |
| `GET /business/chat/conversations?page=1&size=100` | HTTP 200 | `1230446785265168384` | 域名、Gateway、Java、Token 和读取权限链路正常 |
| `POST /business/chat/conversations` | HTTP 403 | `1230446825664704512` | Java 拒绝当时浏览器 Token 的创建请求 |
| `POST /business/documents`，`documentType=CONTRACT` | HTTP 403 | `1230446660778225664` | Java 拒绝当时浏览器 Token 的上传请求 |
| `POST /business/contract-reviews/tasks` | 未调用 | 无 | 因上传没有返回 `fileId`，前端不会执行第二步 |

因此，历史 403 不是网络未连接，也不是按钮没有事件，而是当时浏览器 Token 被 Java 安全层拒绝。

两条 403 响应都包含 `X-Trace-Id`，但 Caddy 日志显示没有 `Content-Type: application/json`，响应体大小均为 20 字节。因此可以确定它们不是标准 ContiNew `R` JSON；不能仅凭页面显示的 `Forbidden` 断言响应体原文就是 `Forbidden`，因为该文字是前端使用 HTTP `statusText` 得到的兜底信息。

当前 Java 的 `/v3/api-docs` 返回服务器异常，因此本文的接口字段来自已提供的 `business-api` 文档和当前前端 Adapter，而不是从运行中 OpenAPI 再生成。继续联调前，Java 仍应核对运行版本是否与交付文档一致。

2026-07-18 10:04 使用新验证码、新登录请求取得全新 admin Token 后的验证结果：

| 请求 | 结果 | Trace ID | 关键返回 |
| --- | --- | --- | --- |
| `POST /auth/login` | HTTP 200 | `1230458914588356608` | 新 Token，未记录或输出 Token 内容 |
| `GET /auth/user/info` | HTTP 200 | `1230458916584845312` | `admin`、`super_admin`、`*:*:*` |
| `POST /business/chat/conversations` | HTTP 200 | `1230458918262566912` | `conversationId=868795828427296786` |
| `POST /business/documents` | HTTP 200 | `1230458919982231552` | `fileId=file-ccd9bf29077c` |

这组结果证明 Java 当前的 admin 身份和写权限正常。历史 403 最可能来自旧 Token 或非 admin Token；如果后端在两组测试之间修改过权限、缓存或部署，则也可能产生相同现象，需要结合后端变更时间排除。

## 4. 认证与通用请求规则

### 4.1 Token

- 登录成功后读取 ContiNew `R.data.token`。
- Token 保存到 `sessionStorage`。
- 存储键：`proofspace_access_token`。
- 业务请求统一携带：`Authorization: Bearer <token>`。
- 收到 HTTP 401 或 `R.code === "401"` 时清除 Token。
- 当前 HTTP 403 不会清除 Token，因为 403 通常表示“已登录但无权限”。

基线代码原有的身份闭环缺口：

- `ContinewAuthApi.login()` 会在登录前清除旧 Token，登录成功后保存新 Token，但基线版本没有继续验证身份。
- `ContinewAuthApi.getSession()` 直接返回 `null`，没有调用 `/auth/user/info`。
- `_app.tsx` 没有向 `AppShell` 传入真实会话，后台统一使用固定的“用户 / 已登录”。
- 页面只要发现 sessionStorage 中有任意非空 Token 就会尝试调用业务接口，不能证明该 Token 属于谁。

本次前端修复已经实现：登录成功暂存 Token → 调用 `/auth/user/info` → 校验返回结构和登录用户名 → 保存真实用户资料并进入后台；身份接口失败立即清除 Token。应用启动时发现已有 Token，也会重新调用用户信息接口，后台用户区使用 Java 返回的昵称和角色。

测试环境可以断言 admin 必须返回 `super_admin` 和 `*:*:*`；正式产品不能把这两个值硬编码为所有用户的登录条件，否则未来普通角色将无法使用系统。

### 4.2 ContiNew 普通响应

除 SSE 外，普通接口必须返回：

```json
{
  "code": "0",
  "msg": "操作成功",
  "success": true,
  "timestamp": 1784330000000,
  "data": {}
}
```

前端只把 `data` 交给业务 Adapter。非 JSON、非标准 `R` 或错误状态会进入统一错误处理。

### 4.3 幂等键

以下写操作已经携带 `Idempotency-Key`：

- 文件上传；
- 制度审校任务创建；
- 合同审查任务创建；
- 会话创建；
- SSE 消息发送。

当前已发现一个前端缺口：删除问答会话虽然上层生成了幂等键，但 `BusinessChatApi.deleteConversation` 没有把它传给 `HttpClient`。

### 4.4 SSE

问答流式接口不按普通 `R` 解析。前端已经处理：

- `meta`：保存 `requestId`、`conversationId`、`messageId`；
- `delta`：按接收顺序追加回答；
- `citation`：单独保存引用来源；
- `done`：确认本次回答完整成功；
- `error`：展示 `errorMessage`，依据 `retryable` 决定是否显示重试；
- 网络中断重试时复用原 `Idempotency-Key`。

## 5. 当前服务组合根

`src/app/services.ts` 是页面使用哪个 Adapter 的唯一组合入口。

| 模块 | 当前 Adapter | 状态 |
| --- | --- | --- |
| 登录与验证码 | `ContinewAuthApi` | 登录、`/auth/user/info`身份复核和真实用户展示均已接 Java |
| 文件上传与分类 | `MockClassificationWorkflowApi` + Java 文件上传回调 | 混合链路 |
| 分类任务池 | `MockClassificationTaskPoolApi` + Java 审校任务创建回调 | 混合链路 |
| 审查任务池 | `BusinessReviewApi` | 真实 Java，只读结果 |
| 合同专项审查 | `BusinessContractReviewApi` | 已接 Java路径；新 admin Token 上传已成功，浏览器待重新登录复测 |
| 智能问答 | `BusinessChatApi` | 已接 Java；新 admin Token 创建已成功，浏览器待重新登录复测 |
| 知识库 | `MockKnowledgeApi` | 本地 Mock |
| 工作台 | 静态 `DashboardApi` | 本地静态数据 |
| 通用文档仓库 | `MockDocumentRepository` | 本地 Mock |

## 6. 页面按钮与接口对照

### 6.1 网页登录/注册

| 页面操作 | 前端行为 | Java 接口 | 当前状态 |
| --- | --- | --- | --- |
| 页面进入登录模式 | 自动加载验证码 | `GET /api/continew/captcha/image` → `GET /captcha/image` | 已接 Java |
| 重新加载验证码 | 重新请求验证码 | 同上 | 已接 Java |
| 进入工作台 | 加密密码并登录 | `POST /api/continew/auth/login` → `POST /auth/login` | 已接 Java |
| 注册/提交注册申请 | 返回“暂未开放” | 无 | 尚未接后端 |
| 退出登录 | 清除 `sessionStorage` Token | 无 | 仅前端 |

登录请求体：

```json
{
  "clientId": "ef51c9a3e9046c4f2ea45142c8a8344a",
  "authType": "ACCOUNT",
  "username": "admin",
  "password": "前端加密后的密码",
  "captcha": "用户输入",
  "uuid": "验证码接口返回值"
}
```

### 6.2 文件上传与分类

该页面不是完整 Java 分类功能，而是“真实文件上传 + 本地分类候选”的混合实现。

| 页面操作 | 前端行为 | Java 接口 | 当前状态 |
| --- | --- | --- | --- |
| 选择/拖入文件 | 只加入待上传浮窗 | 无 | 仅前端 |
| 确认上传 | 每个文件先取得可复用 `fileId` | `POST /business/documents`，`documentType=POLICY` | 已接线；文件接口已用新 admin Token 验证可写 |
| 查看分类候选 | 读取内存候选 | 无 | Mock |
| 预览 | 返回固定预览内容 | 无 | Mock |
| 确认/批量确认分类 | 把人工分类写入本地仓库 | 无 | Mock |
| 删除/批量删除候选 | 从本地候选列表移除 | 无 | Mock |
| 查看分类任务池 | 页面跳转 | 无 | 仅前端路由 |

上传成功后，候选记录保存 Java 返回的 `fileId`；确认分类后，分类任务记录继续携带同一个 `fileId`。

### 6.3 分类任务池

| 页面操作 | 前端行为 | Java 接口 | 当前状态 |
| --- | --- | --- | --- |
| 加载任务池 | 读取本地文档仓库 | 无 | Mock |
| 预览 | 固定预览内容 | 无 | Mock |
| 直接入库 | 写入本地知识库集合 | 无 | Mock |
| 发起审查 | 使用已有 `fileId` 创建制度审校任务 | `POST /business/review/tasks` | 已接 Java |
| 发起审查成功 | 本地更新状态并跳转审查任务池 | 无额外接口 | 混合链路 |
| 删除 | 本地软删除状态 | 无 | Mock |

创建制度审校任务请求：

```http
POST /business/review/tasks
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "fileId": "首次上传返回的fileId"
}
```

如果历史 Mock 样例没有真实 `fileId`，前端会阻止发起审查。

### 6.4 审查任务池与制度审校报告

| 页面操作/行为 | Java 接口 | 当前状态 |
| --- | --- | --- |
| 进入审查任务池 | `GET /business/review/tasks?page=&size=` | 已接 Java |
| 刷新进行中任务 | `GET /business/review/tasks/{taskId}` | 已接 Java，2.5 秒轮询 |
| 页面不可见 | 暂停轮询 | 已实现 |
| 查看进度 | 打开报告/任务页面并查询任务 | 已接 Java |
| 查看报告 | `GET /business/review/tasks/{taskId}`，成功后再请求 `/result` | 已接 Java |
| 获取审校结果 | `GET /business/review/tasks/{taskId}/result` | 已接 Java |
| 忽略风险、应用修改、入库、删除 | Adapter 明确返回只读错误 | 第一阶段未接入 |

支持状态：`CREATED`、`RUNNING`、`SUCCEEDED`、`FAILED`。

### 6.5 合同专项审查上传页

页面当前只保留一份待审查合同，用户可选择：

- 文件名称；
- 审查偏向：偏向甲方、偏向乙方、中立审查；
- 审查范围：交易结构、履约付款、合规授权、数据安全、知识产权、终止退出。

点击“开始审查”是严格的两步流程：

#### 第一步：上传合同

```http
POST /business/documents
Authorization: Bearer <token>
Idempotency-Key: <任务幂等键>:document
Content-Type: multipart/form-data
```

```text
file=<合同文件>
documentType=CONTRACT
```

期望 `R.data` 至少返回：

```json
{
  "fileId": "可复用文件ID",
  "fileName": "测试合同.docx",
  "size": 13218
}
```

#### 第二步：创建合同审查任务

只有第一步成功并取得 `fileId` 后才会执行：

```http
POST /business/contract-reviews/tasks
Authorization: Bearer <token>
Idempotency-Key: <任务幂等键>
Content-Type: application/json
```

当前前端请求体：

```json
{
  "contractFileId": "合同fileId",
  "name": "测试合同.docx",
  "stance": "neutral",
  "modules": [
    "transaction",
    "performance-payment",
    "data-security",
    "intellectual-property",
    "termination"
  ]
}
```

当前产品决定是不再强制传 `policyFileIds`。Java 契约需要与这一决定同步。

历史浏览器测试失败发生在第一步：`POST /business/documents` 返回 HTTP 403，因此第二步未调用；新 admin Token 已验证第一步返回 200 和 `fileId`，浏览器清理旧 Token 后应重新测试完整两步链路。

### 6.6 合同审查任务池

| 页面操作/行为 | Java 接口 | 当前状态 |
| --- | --- | --- |
| 进入任务池/刷新 | `GET /business/contract-reviews/tasks?page=1&size=100` | 已接线，待 Java 验证 |
| 自动刷新进行中任务 | `GET /business/contract-reviews/tasks/{taskId}` | 已接线，2.5 秒轮询 |
| 页面不可见 | 暂停轮询 | 已实现 |
| 查看进度/报告/失败原因 | 跳转工作台，工作台查询任务 | 已接线 |
| 上传合同 | 页面跳转 | 无接口 |

### 6.7 合同审查工作台

| 页面操作/行为 | 接口或存储 | 当前状态 |
| --- | --- | --- |
| 加载任务 | `GET /business/contract-reviews/tasks/{taskId}` | 已接线 |
| 任务成功后加载报告 | `GET /business/contract-reviews/tasks/{taskId}/result` | 已接线 |
| 加载 WPS 编辑会话 | `GET /api/contract-review/tasks/{taskId}/editor-session` | Next.js/WPS 配置，不是 ContiNew 业务接口 |
| 定位原文 | WPS SDK 或本地滚动 | 前端/WPS |
| 应用修改 | 可写入 WPS；风险状态只保存浏览器 `localStorage` | 未写回 Java |
| 忽略风险 | 保存浏览器 `localStorage` | 未写回 Java |
| 撤销处理 | 保存浏览器 `localStorage`，必要时修改 WPS | 未写回 Java |
| 确认并入库 | 只在浏览器标记 `stored` | 未写回 Java |
| 合同解析页签 | 前端根据现有任务展示 | 无独立 Java 接口 |
| 合同工作台实时问答 | `setTimeout` 生成本地回答 | 当前是本地演示，不是智能问答 Java SSE |

合同工作台中的风险处理和“确认并入库”目前不能作为真实业务落库证据。

### 6.8 智能问答

| 页面操作/行为 | Java 接口 | 当前状态 |
| --- | --- | --- |
| 进入页面 | `GET /business/chat/conversations?page=1&size=100` | 现场 HTTP 200 |
| 选择提问集 | `GET /business/chat/conversations/{conversationId}/messages` | 已接 Java |
| 新建提问集 | `POST /business/chat/conversations` | 历史浏览器 Token 为 403；新 admin Token 已验证为 200 |
| 删除提问集 | `DELETE /business/chat/conversations/{conversationId}` | 已接线；缺少幂等键透传 |
| 发送问题 | `POST /business/chat/conversations/{conversationId}/messages/stream` | 已接 SSE，需先成功创建会话 |
| 重试 | 复用原问题和原幂等键 | 已实现 |

创建会话请求：

```json
{
  "title": "新建提问集"
}
```

Java 必须给当前账号角色授予 `business:chat:create`。否则前端不能生成真实 `conversationId`，也不能继续测试消息、引用和 SSE。

### 6.9 知识库和工作台

| 页面/操作 | 当前实现 |
| --- | --- |
| 工作台统计 | 本地静态数据，不读取 Java |
| 知识库列表 | `MockKnowledgeApi` |
| 知识图谱 | `MockKnowledgeApi` |
| 知识库预览 | 本地 Mock |
| 知识库删除 | 本地 Mock 软删除 |
| 分类任务“直接入库”后的知识库记录 | 只存在前端内存仓库，刷新/重启后不可靠 |

## 7. Java 接口与权限清单

| 权限 | 接口 | 前端用途 |
| --- | --- | --- |
| `business:document:upload` | `POST /business/documents` | 首次上传并取得可复用 `fileId` |
| `business:review:create` | `POST /business/review/tasks` | 从分类任务池发起制度审校 |
| `business:review:list` | `GET /business/review/tasks` | 审查任务池 |
| `business:review:get` | `GET /business/review/tasks/{taskId}`、`/result` | 进度与只读报告 |
| `business:contract-review:create` | `POST /business/contract-reviews/tasks` | 创建合同审查任务 |
| `business:contract-review:list` | `GET /business/contract-reviews/tasks` | 合同任务池 |
| `business:contract-review:get` | `GET /business/contract-reviews/tasks/{taskId}`、`/result` | 合同进度和报告 |
| `business:chat:create` | `POST /business/chat/conversations` | 新建提问集 |
| `business:chat:list` | `GET /business/chat/conversations` | 提问集列表 |
| `business:chat:get` | `GET /business/chat/conversations/{id}/messages` | 历史消息 |
| `business:chat:delete` | `DELETE /business/chat/conversations/{id}` | 删除提问集 |
| `business:chat:send` | `POST /business/chat/conversations/{id}/messages/stream` | SSE 问答 |

权限节点写入 `sys_menu` 后，还需要确认当前用户所属角色通过 `sys_role_menu` 获得权限，并在授权后刷新权限缓存或重新登录。

### 7.1 Java 侧最小处理清单

Java/ContiNew 侧需要按顺序确认：

1. Controller 的实际权限表达式是否与上表一致，不能只确认数据库里“看起来有菜单”。
2. `admin` 当前所属角色是否通过 `sys_role_menu` 关联到对应权限节点。
3. 数据权限或租户过滤是否又在方法内部拒绝写操作。
4. 修改权限后清理权限缓存，并要求浏览器重新登录刷新 Token/会话上下文。
5. 当前 403 已经带有 `X-Trace-Id`；还需将错误响应统一为标准 ContiNew `R` JSON，并明确 `Content-Type: application/json`。
6. 用后端自己的调用方式先验证同一 Token 能完成 POST，再交给浏览器复测。

### 7.2 两条 P0 链路的验收标准

合同审查：

```text
POST /business/documents = 2xx
  → R.data.fileId 非空
  → POST /business/contract-reviews/tasks = 2xx
  → R.data.taskId 非空
  → GET 任务详情出现 CREATED/RUNNING/SUCCEEDED/FAILED
```

智能问答：

```text
POST /business/chat/conversations = 2xx
  → R.data.conversationId 非空
  → GET /messages = 2xx
  → POST /messages/stream 返回 text/event-stream
  → meta/delta/citation/done 或 error 能完整结束
```

只把 403 改成 200 还不算联调完成；必须验证返回字段能驱动下一步，并且任务/会话重新进入页面后仍可查询。

## 8. 前端现在可以立即修改什么

以下修改不需要等待 Java 新业务逻辑完成：

### P0：改善错误定位

1. `HttpClient` 已经能读取标准 `R.msg`；还需为纯文本/非标准 JSON 的 401、403、404、409、429、500 提供中文兜底文案。
2. `HttpClient` 已经保存标准错误中的 Trace ID；还需从所有非 2xx 响应头读取 `X-Trace-Id`，并在页面反馈中显示。
3. 合同“开始审查”拆分错误阶段：
   - `合同文件上传失败：……`；
   - `合同任务创建失败：……`。
4. 智能问答针对 403 显示当前已核验用户名和角色；身份未核验时先要求重新登录，不直接断言 Java 未授权。

### P0：补齐幂等性

1. 删除提问集时把已有 `Idempotency-Key` 传入 `HttpClient`。
2. 为所有新增写接口添加幂等性单元测试。

### P1：明确真实/本地能力边界

1. 合同风险“应用修改、忽略、撤销、确认并入库”增加“尚未写回 Java”提示，或在后端接口完成前禁用正式提交语义。
2. 合同工作台的本地问答标为“演示问答”，避免误认为已经接 SSE。
3. 知识库、工作台和分类确认保持当前设计，但明确数据仍是本地 Mock。
4. Java 接口返回成功前，不向任务池插入伪任务，不用 Mock 掩盖身份错误或 403。

### P1：提高契约健壮性

1. 为文件、任务、报告、会话和消息增加运行时字段校验。
2. 统一处理 `PageResp` 的分页字段。
3. 检查日期、空值、未知状态和报告暂未生成等边界。
4. 为 `Retry-After` 增加 HTTP Client 支持。

### P2：等待 Java 契约后再接入

以下功能需要 Java 先给出明确接口，前端不应自行猜字段：

- 分类候选列表、分类确认、批量确认和候选软删除；
- 分类任务直接入库和删除；
- 合同风险处置写回、版本冲突和合同结果入库；
- 知识库列表、图谱、预览和软删除；
- 工作台真实统计；
- 合同工作台专用上下文问答。

## 9. 推荐的下一次前端改动范围

建议先做一个不改变业务流程的小补丁：

1. 403/404/Trace ID 精确反馈；
2. 合同上传与任务创建分阶段反馈；
3. 删除提问集补齐幂等键；
4. 补充相关单元测试；
5. 不修改页面标题、审查偏向、审查范围和现有视觉结构；
6. 不接入旧 ProofSpace 后端，不切换到 `continew-dev-java:18080`。

完成后，页面可以明确证明当前 Token 对应的用户、角色和权限，并显示失败发生在哪个接口和哪个阶段；这样才不会再把旧 Token 误判为 Java 权限配置错误。

## 10. 不应采取的做法

- 不在前端硬编码“管理员权限”或伪造角色、用户、租户、部门。
- 不因为 403 就把真实 Adapter 换回 Mock，让页面假装成功。
- 不在合同上传失败后插入假的合同任务。
- 不把 Java 的 403 改写成前端成功响应。
- 不重新连接旧 ProofSpace 后端，也不切换到 `continew-dev-java:18080`。
- 不在 Java 契约未确定时自行新增 `policyFileIds`、用户标识或租户标识。

这些做法可能让演示暂时“有反应”，但会破坏权限边界和真实链路，后续无法判断数据是否真正进入 Java。
