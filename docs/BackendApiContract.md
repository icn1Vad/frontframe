# ProofSpace 后端 API 契约

## 1. 文档目的

本文档是前端应用端口与后端 HTTP API 之间的实施约定。后端应以
`openapi/proofspace.yaml` 为机器可读的权威定义，以本文档解释业务语义、
状态流转、并发控制和安全边界。

当前前端仍默认使用 Mock Adapter。真实联调时通过
`src/infrastructure/http` 导出的 `createBrowserHttpAppServices()` 或
`createServerHttpAppServices()` 切换到 HTTP Adapter，不应在页面组件中直接拼接 URL。

Pages Router 的 `getServerSideProps` 必须创建“请求级”服务实例，并把当前请求的
Cookie 转发给 `createServerHttpAppServices()`；禁止在服务端使用共享的认证单例，
否则会造成用户会话串线。浏览器端使用 `createBrowserHttpAppServices()`，该工厂
在浏览器进程内复用同一实例，以保持轮换后的 CSRF Token。

```ts
// 浏览器端
const services = createBrowserHttpAppServices();

// getServerSideProps 内
const services = createServerHttpAppServices({
  backendOrigin: process.env.API_BACKEND_ORIGIN!,
  cookieHeader: req.headers.cookie,
});
```

## 2. 已确定的三项基础选择

### 2.1 认证：HttpOnly Cookie

- 登录成功后由后端设置会话 Cookie。
- Cookie 建议名称：`proofspace_session`。
- Cookie 属性：`HttpOnly; Secure; SameSite=Lax; Path=/`。
- 浏览器 JavaScript 不读取、不保存 Access Token 或 Refresh Token。
- 所有请求使用 `credentials: include`。
- 登录和会话接口返回短期 CSRF Token；除公开登录、注册和外部对象存储
  `PUT` 外，所有非 GET 请求通过 `X-CSRF-Token` Header 提交。
- 会话续期由后端采用滑动过期策略完成，不向前端暴露 Refresh Token。
- 未认证返回 `401`；已认证但权限不足返回 `403`。

### 2.2 文件：对象存储预签名上传

文件不经过 Next.js/Vercel，也不由业务 API 代理完整文件内容。

统一流程：

1. 前端调用 `POST /uploads/initiate` 获取短期预签名地址。
2. 前端直接向对象存储执行 `PUT`。
3. 前端调用 `POST /uploads/{uploadId}/complete`。
4. 后端完成大小、类型、ETag、恶意文件检测状态等校验，返回稳定 `fileId`。
5. 分类或合同接口只引用 `fileId`。

预签名地址属于一次性、短时凭证，不得写入日志或业务数据库的普通文本字段。

### 2.3 AI 状态：轮询

V1 使用轮询，不使用 SSE 或 WebSocket。

- 分类候选列表：页面可见时每 2 秒刷新一次。
- 审查进度：初始 1.5 秒，指数退避到最大 5 秒。
- 合同审查任务：初始 1.5 秒，指数退避到最大 5 秒。
- 页面不可见时暂停轮询。
- 单次连续轮询最长 5 分钟，超时后提示用户手动刷新。
- 后端可通过 `Retry-After` Header 建议下一次轮询间隔。
- 所有轮询请求均允许通过 `AbortSignal` 取消。

将来如切换 SSE，事件数据必须复用本文定义的资源对象和状态码，不能再维护第二套状态模型。

## 3. 通用 HTTP 约定

### 3.1 基础路径和格式

- Base URL：`/api/v1`
- JSON：`application/json; charset=utf-8`
- 错误：`application/problem+json`
- 时间：ISO 8601，必须包含 `Z` 或明确时区偏移。
- ID：不允许前端推断格式；只视为不透明字符串。
- 数组 Query 参数采用重复参数：

```text
GET /api/v1/classification/candidates?state=classifying&state=awaiting-confirmation
```

### 3.2 成功响应

除 `204 No Content` 和对象存储上传外，统一使用：

```json
{
  "data": {
    "id": "doc_01J..."
  },
  "traceId": "01J..."
}
```

分页对象放在 `data` 内：

```json
{
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "pageCount": 0
  },
  "traceId": "01J..."
}
```

### 3.3 错误响应

```json
{
  "type": "https://api.proofspace.example/problems/version-conflict",
  "title": "版本冲突",
  "status": 409,
  "code": "VERSION_CONFLICT",
  "detail": "记录已被其他用户更新，请刷新后重试。",
  "traceId": "01J...",
  "retryable": false,
  "fieldErrors": [
    {
      "field": "items[0].name",
      "code": "REQUIRED",
      "message": "文件名称不能为空"
    }
  ]
}
```

必须稳定支持的错误码：

| HTTP | `code` | 含义 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 参数或字段校验失败 |
| 401 | `UNAUTHENTICATED` | 会话不存在或已过期 |
| 403 | `FORBIDDEN` | 当前用户无操作权限 |
| 404 | `NOT_FOUND` | 资源不存在或不可见 |
| 409 | `VERSION_CONFLICT` | `expectedVersion` 或 `If-Match` 冲突 |
| 409 | `INVALID_STATE_TRANSITION` | 当前状态不允许该操作 |
| 409 | `IDEMPOTENCY_CONFLICT` | 相同幂等键对应了不同请求 |
| 413 | `FILE_TOO_LARGE` | 文件超过限制 |
| 415 | `UNSUPPORTED_FILE_TYPE` | 文件类型不受支持 |
| 422 | `RISK_REASON_REQUIRED` | 忽略风险但未提供理由 |
| 429 | `RATE_LIMITED` | 请求过于频繁 |
| 502 | `UPSTREAM_UNAVAILABLE` | AI、对象存储或在线编辑器不可用 |
| 503 | `SERVICE_UNAVAILABLE` | 当前服务暂不可用 |

### 3.4 幂等与并发

- 所有支持重试的业务资源创建、状态变更、删除和批量写操作必须携带
  `Idempotency-Key`；登录、会话读取、退出和当前版本的公开注册接口除外。
- 当前 `POST /auth/registrations` 不接收 `Idempotency-Key`，客户端不得对注册请求
  做无条件自动重试；如后端将注册改为可幂等重试，必须同步更新 TypeScript 接口、
  HTTP Adapter 和 OpenAPI 参数定义。
- 同一用户、同一路径和同一幂等键必须返回第一次成功响应。
- 相同幂等键但请求体不同，返回 `409 IDEMPOTENCY_CONFLICT`。
- 分类候选人工确认通过请求体中的 `expectedVersion` 进行乐观锁校验。
- 合同任务写操作使用 `If-Match: "<version>"`。
- 版本冲突时不得部分覆盖新数据。
- `operator`、处理时间、审计字段必须由后端依据当前会话生成，前端不得提交。

### 3.5 删除

- 业务删除全部为软删除。
- 删除成功应返回删除后的资源状态，便于前端立即更新。
- 删除审查中任务必须在同一事务内创建终止报告。
- 删除知识条目时，分类或通用审查来源任务同步软删除。
- 合同知识删除是否同步删除合同专项任务，V1 不执行级联，只删除知识可用性。

## 4. 端点总表

### 4.1 认证和工作台

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| POST | `/auth/login` | 公开 | 登录并设置会话 Cookie |
| POST | `/auth/registrations` | 公开 | 提交账号申请 |
| GET | `/auth/session` | 可匿名 | 获取当前会话和 CSRF Token |
| POST | `/auth/logout` | 已登录 | 清除会话 Cookie |
| GET | `/dashboard/overview` | `dashboard:read` | 工作台资产统计 |

### 4.2 上传

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| POST | `/uploads/initiate` | `documents:write` 或 `contracts:write` | 获取预签名上传地址 |
| POST | `/uploads/{uploadId}/complete` | 同 initiate | 确认上传完成并生成 `fileId` |
| DELETE | `/uploads/{uploadId}` | 同 initiate | 放弃未完成上传 |

对象存储的 `PUT uploadUrl` 不属于业务 API，不携带 ProofSpace Cookie。

### 4.3 文件分类

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/classification/candidates/stats` | `documents:write` | 获取分类中和待确认统计 |
| GET | `/classification/candidates` | `documents:write` | 筛选、分页获取候选文件 |
| POST | `/classification/candidates/batch` | `documents:write` | 使用 `fileId` 创建候选并启动 AI 分类 |
| GET | `/classification/candidates/{candidateId}/preview` | `documents:write` | 获取候选文件预览 |
| POST | `/classification/candidates/batch-confirm` | `documents:write` | 批量确认最终分类 |
| POST | `/classification/candidates/batch-delete` | `documents:write` | 批量软删除候选 |

### 4.4 分类任务池

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/classification-tasks` | `documents:write` | 分页获取分类任务 |
| GET | `/classification-tasks/{documentId}/preview` | `documents:write` | 预览原文件 |
| POST | `/classification-tasks/{documentId}/publish` | `documents:write` | 分类结果直接入库 |
| POST | `/classification-tasks/{documentId}/start-review` | `reviews:write` | 创建通用审查任务 |
| DELETE | `/classification-tasks/{documentId}` | `documents:write` | 软删除分类任务 |

### 4.5 通用审查任务池

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/review-tasks` | `reviews:read` | 分页获取审查任务 |
| GET | `/review-tasks/{reviewTaskId}/document` | `reviews:read` | 根据任务获取来源文档 |
| GET | `/review-tasks/{reviewTaskId}/progress` | `reviews:read` | 获取轮询进度 |
| GET | `/review-tasks/{reviewTaskId}/report` | `reviews:read` | 获取正式或终止报告 |
| POST | `/review-tasks/{reviewTaskId}/termination-report` | `reviews:write` | 创建终止报告 |
| POST | `/review-tasks/{reviewTaskId}/risks/{riskId}/resolve` | `reviews:write` | 标记单项风险已处理 |
| POST | `/review-tasks/{reviewTaskId}/risks/{riskId}/ignore` | `reviews:write` | 填写理由并忽略单项风险 |
| POST | `/review-tasks/{reviewTaskId}/risks/batch-ignore` | `reviews:write` | 填写理由并忽略全部待处理风险 |
| POST | `/review-tasks/by-document/{documentId}/publish` | `reviews:write` | 已审查文件入库 |
| DELETE | `/review-tasks/by-document/{documentId}` | `reviews:write` | 软删除或终止审查任务 |

### 4.6 合同专项审查

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/contract-review/tasks` | `contracts:read` | 获取合同任务 |
| POST | `/contract-review/tasks` | `contracts:write` | 使用 `fileId` 创建合同任务 |
| GET | `/contract-review/tasks/{taskId}` | `contracts:read` | 获取合同任务、条款和风险 |
| GET | `/contract-review/tasks/{taskId}/editor-session` | `contracts:read` | 获取在线编辑器短期会话 |
| POST | `/contract-review/tasks/{taskId}/start` | `contracts:write` | 启动合同审查 |
| POST | `/contract-review/tasks/{taskId}/report` | `contracts:write` | 生成报告 |
| PATCH | `/contract-review/tasks/{taskId}/risks/{riskId}` | `contracts:write` | 处理、忽略或撤销风险 |
| POST | `/contract-review/tasks/{taskId}/store` | `contracts:write` | 入库并创建公共知识条目 |

### 4.7 通用文档资源

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/documents/{documentId}` | 所属资源的读取权限 | 获取文档摘要；无权访问或不存在时 `data` 为 `null` |

该端点对应前端 `DocumentRepository.getById()`，用于在跨模块场景下按文档 ID
获取统一的 `DocumentSummary`。它不替代分类任务、通用审查任务或知识库的专用
列表端点；后端仍需根据文档来源执行资源级权限校验。

### 4.8 知识库

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/knowledge` | `knowledge:read` | 分页获取正式知识 |
| GET | `/knowledge/graph` | `knowledge:read` | 获取关系图 |
| GET | `/knowledge/{documentId}/preview` | `knowledge:read` | 查看分类来源原文 |
| GET | `/knowledge/{documentId}/report` | `knowledge:read` | 查看通用审查报告摘要 |
| DELETE | `/knowledge/{documentId}` | `knowledge:write` | 删除知识并执行来源级联 |

### 4.9 智能问答

| Method | Path | 权限 | 用途 |
|---|---|---|---|
| GET | `/chat/conversations` | `chat:use` | 获取提问集 |
| POST | `/chat/conversations` | `chat:use` | 创建提问集 |
| GET | `/chat/conversations/{conversationId}` | `chat:use` | 获取消息和引用 |
| DELETE | `/chat/conversations/{conversationId}` | `chat:use` | 删除提问集 |
| POST | `/chat/conversations/{conversationId}/messages` | `chat:use` | 提问并返回带引用的回答 |

V1 问答使用普通请求响应，不做流式输出。后端必须保证引用文件来自当前用户有权访问且未删除的正式知识库。

## 5. 状态流转

### 5.1 文件分类

```text
本地待上传
  → 对象存储 ready
  → classifying
  → awaiting-confirmation
  → 人工确认
  → 分类任务池 pending
```

- `classifying` 时允许人工提前确认，但必须提交 `manualOverride=true`。
- 人工确认成功后，候选记录离开当前候选列表。
- AI 回写必须携带 AI 启动时的版本号；版本不一致时丢弃回写。
- 批量确认和删除允许部分成功，失败项继续留在页面。

### 5.2 分类任务

```text
pending / classified
  ├─ publish → published(source=classification)
  ├─ start-review → reviewing
  └─ delete → deleted
```

### 5.3 通用审查

```text
reviewing
  ├─ 完成 → reviewed
  └─ 删除 → termination report + deleted

reviewed
  ├─ 逐项 resolve / ignore
  ├─ batch-ignore（次要路径，理由必填）
  ├─ 全部风险处理后 publish
  └─ delete → deleted（保留正式报告）
```

- 任一风险仍为 `open` 时，入库返回 `409 INVALID_STATE_TRANSITION`。
- 已入库和已删除报告只读。
- 忽略理由不得为空白，且必须写入审计日志。

### 5.4 合同专项审查

```text
queued → reviewing → reported → stored
```

- 每次写操作返回增加后的 `version`。
- `PATCH risk` 支持 `open`、`resolved`、`ignored`。
- `ignored` 必须提供 `reason`。
- 只有报告已生成且所有风险非 `open` 才能 `stored`。
- `stored` 必须在同一事务内创建来源为 `contract-review` 的知识条目。

## 6. 关键请求示例

### 6.1 登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "zhangsan",
  "password": "********"
}
```

```json
{
  "data": {
    "status": "authenticated",
    "message": "登录成功",
    "session": {
      "user": {
        "id": "user_01J...",
        "username": "zhangsan",
        "displayName": "张三",
        "roleLabel": "管理员",
        "permissions": ["dashboard:read", "documents:write"]
      },
      "expiresAt": "2026-07-16T18:00:00+08:00",
      "csrfToken": "short-lived-csrf-token"
    }
  }
}
```

### 6.2 初始化上传

```http
POST /api/v1/uploads/initiate
Idempotency-Key: upload-01
X-CSRF-Token: ...

{
  "fileName": "采购管理办法.docx",
  "size": 248832,
  "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "lastModified": 1784179200000
}
```

```json
{
  "data": {
    "uploadId": "upload_01J...",
    "uploadUrl": "https://object-storage.example/...",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    "expiresAt": "2026-07-16T17:10:00+08:00"
  }
}
```

### 6.3 创建分类候选

```http
POST /api/v1/classification/candidates/batch
Idempotency-Key: classify-upload-01

{
  "files": [
    { "fileId": "file_01J..." }
  ]
}
```

返回 `ClassificationCandidateRecord[]`，初始状态为 `classifying`，`version=1`。

### 6.4 批量确认

```json
{
  "items": [
    {
      "id": "candidate_01J...",
      "name": "采购管理办法.docx",
      "type": "policy",
      "level": "company",
      "category": "procurement",
      "expectedVersion": 2,
      "manualOverride": false
    }
  ]
}
```

```json
{
  "data": {
    "succeeded": [
      {
        "candidateId": "candidate_01J...",
        "document": {}
      }
    ],
    "failed": [
      {
        "id": "candidate_02J...",
        "code": "conflict",
        "message": "文件已被其他操作更新，请刷新后重试"
      }
    ]
  }
}
```

### 6.5 忽略风险

```http
POST /api/v1/review-tasks/review_01J.../risks/risk_01J.../ignore
Idempotency-Key: ignore-risk-01
X-CSRF-Token: ...

{
  "reason": "经法务复核，该条款属于已批准的例外安排"
}
```

### 6.6 创建合同任务

```http
POST /api/v1/contract-review/tasks
Idempotency-Key: contract-task-01

{
  "fileId": "file_01J...",
  "name": "软件技术服务合同.docx",
  "stance": "party-a",
  "modules": [
    "transaction",
    "performance-payment",
    "data-security"
  ]
}
```

后续写操作携带：

```http
If-Match: "3"
```

版本不一致返回 `409 VERSION_CONFLICT`。

## 7. 文件限制

V1 默认限制：

- 单文件最大 50 MB。
- 单批最多 20 个文件。
- 分类支持：PDF、DOC、DOCX、TXT。
- 合同专项审查支持：PDF、DOCX。
- 后端必须同时校验扩展名、MIME 和文件签名，不能只信任浏览器 MIME。
- 文件完成安全检查前不得进入 AI 解析。
- 预签名地址默认 10 分钟过期。

## 8. 后端事务边界

以下操作必须原子执行：

1. 分类候选确认成功 → 创建分类任务 → 删除候选。
2. 分类任务开始审查 → 创建审查任务 → 更新来源任务状态。
3. 审查中删除 → 创建终止报告 → 软删除任务。
4. 通用审查入库 → 创建知识条目 → 更新审查任务状态。
5. 合同审查入库 → 创建合同知识条目 → 更新合同任务状态。
6. 知识删除 → 标记知识不可用于问答 → 按来源执行规定的级联软删除。

## 9. 审计要求

至少记录：

- 操作人 ID、显示名；
- 组织或租户 ID（如果后端启用多租户）；
- 操作类型；
- 资源 ID；
- 操作前后状态；
- 幂等键；
- 请求 Trace ID；
- 操作时间；
- 风险忽略理由；
- 人工覆盖 AI 的标记；
- 删除原因和终止进度。

密码、Cookie、CSRF Token、预签名 URL 和在线编辑器 Token 禁止进入业务日志。

## 10. 前后端联调顺序

1. `/auth/login`、`/auth/session`、`/auth/logout`。
2. 上传三步协议。
3. 分类候选列表、批量确认和批量删除。
4. 分类任务池和通用审查任务池。
5. 风险报告及入库。
6. 合同专项审查。
7. 知识库和问答。
8. 在线编辑器会话。

每完成一组端点，使用 OpenAPI 示例做契约测试，确认错误码、幂等和状态流转后再进入下一组。
