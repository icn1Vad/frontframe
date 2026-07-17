# WPS WebOffice 接入说明

## 当前状态

合同审查工作台保留现有文本预览，并已建立类型安全的 WPS 适配边界：

- `mock`：当前默认模式，不请求 WPS，不读取前端 Token 配置。
- `wps`：仅当已认证的 Java API 返回完整、短期、版本绑定的会话时启用。
- DOCX：第一阶段进入 WPS Writer 只读预览。
- PDF：第一阶段不进入合同在线预览流程。
- 其他格式：明确提示不支持在线编辑，不尝试用错误的 `officeType` 打开。

Java 与前端的第一阶段链路已经实现并通过本地数据库集成测试：真实 DOCX 上传后创建
文档、初始版本和 `preview` 合同任务，Java 通过 Redis 签发短期只读 Token。公网回调
已配置到演示机，但本地开发机与该公网来源不是同一台机器，因此真实 WPS 公有云打开
仍需把同一版本 Java 部署到公网回调实际指向的演示机，或另建专用开发隧道。

## 正式链路

1. 审查任务永久绑定创建时的 `documentVersionId`。
2. 前端兼容入口请求 `GET /api/v1/contract-review/tasks/{taskId}/editor-session`。
3. Java 使用任务永久绑定的版本签发与任务 ID 一致的只读会话；通用版本入口为
   `POST /api/v1/document-versions/{documentVersionId}/office-sessions`。
4. Java 校验租户、用户、合同权限、任务版本绑定关系，记录会话签发审计。
5. Java 动态返回 AppID、fileId、SDK URL、用户权限和短期 Token，并设置
   `Cache-Control: no-store`。
6. 前端 `WpsWebOfficeAdapter` 初始化 SDK，注册打开、错误、选区变化事件；卸载时
   移除监听并销毁实例。
7. 第一阶段权限固定为只读，不注册保存能力。后续开放保存时，每次成功保存必须创建
   新的 `DocumentVersion`，旧任务不得继续修改新版本。

会话响应中的 `data` 结构：

```json
{
  "provider": "wps",
  "sdkUrl": "/vendor/web-office-sdk-solution.umd.js",
  "appId": "configured-wps-app-id",
  "fileId": "tenant-file-id",
  "contractId": "contract-id",
  "taskId": "contract-task-id",
  "documentVersionId": "document-version-id",
  "officeType": "writer",
  "readonly": true,
  "currentUser": {
    "id": "current-user-id",
    "name": "当前用户",
    "permission": "read"
  },
  "token": {
    "token": "short-lived-token-returned-at-runtime",
    "timeout": 600000
  },
  "expiresAt": "2026-07-17T10:00:00.000Z",
  "mode": "normal",
  "customArgs": {
    "taskId": "contract-task-id",
    "documentVersionId": "document-version-id"
  }
}
```

示例值仅描述字段，不是可用凭据。前端 `.env`、`.env.example`、代码仓库和日志中
都不得保存 AppSecret、编辑 Token 或固定 fileId。

## 部署和安全边界

如果存在 WPS 公有云可访问的公网 HTTPS 回调域名，可以使用公有云 Solution；
如果 `https://proofspace.cortexdata.cn` 仅能通过局域网 DNS 解析，则先保持 Mock，
真实联调等待公网回调网关或私有化 WPS 环境。不得为了联调公开 PostgreSQL、Redis、
Java 或对象存储管理端口；公网只通过 HTTPS 网关开放必要的 WPS 回调路径。

AppSecret 只允许由 Java 从服务器受限 secret 文件读取，例如 Docker secret 的只读挂载。
仓库只记录注入机制和文件路径约定，不保存文件内容。secret 文件应仅部署账号和 Java
容器可读，异常和日志不得输出 Secret、完整 Token、下载签名 URL 或合同全文。

第一阶段已经实现并测试：

- 文件信息与短期下载地址；
- 用户权限和批量用户信息；
- 回调签名、AppID、请求时间窗和只读会话 Token 校验；
- 合同任务创建幂等与创建审计；
- 下载地址短期签名、合同访问权限和租户隔离。

暂未实现：三阶段保存、版本 2、版本恢复、编辑、AI 审查和风险定位。

## 本地验证

不具备真实 WPS 条件时：

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

具备真实条件后，还需确认 AppID、SDK/协议版本、测试 DOCX 可访问链路和公网回调，
再用受限测试账号验证第一阶段的打开、无权限、Token 过期、文件不存在和文件超限。
保存成功、保存失败、重复保存和版本恢复属于后续阶段。任何真实 Token 只在运行时签发，
不写入测试脚本。

## 分阶段范围

- 第一阶段：真实 DOCX 初始版本、Redis 短期 Token、只读回调、独立 Adapter、
  加载/错误/销毁和可拖动分栏。
- 第二阶段：书签、段落、范围、全文和上下文指纹的多级定位及多匹配提示。
- 第三阶段：修订模式替换/插入/删除/批注、保存同步、幂等和待同步重试。
- 第四阶段：撤销、接受/拒绝修订、版本记录、审计日志和恢复演练。
