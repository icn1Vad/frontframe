# WPS WebOffice 接入说明

合同审查工作台支持两种编辑器模式：

- `mock`：默认模式，使用前端文本模拟原文定位和修订预览。
- `wps`：服务端返回 WPS 会话后，前端动态加载 WebOffice SDK 并挂载真实 Word 编辑器。

## 推荐生产链路

1. Java 业务层根据租户、用户、任务和文件版本生成短时编辑器会话。
2. 前端请求 `GET /api/contract-review/tasks/{taskId}/editor-session`。
3. Next API 将请求代理到 `CONTRACT_EDITOR_SESSION_ENDPOINT`。
4. 前端调用 `WebOfficeSDK.init()`，将 WPS iframe 挂载到合同审查工作台。
5. 点击风险定位时调用 `ActiveDocument.Find.Execute()` 高亮原文。
6. 应用修改时通过 `Range.Text` 写入文本，并开启修订模式。
7. 调用实例 `save()` 后，WPS 通过回调服务将新版本写回企业文件系统。

Java 会话接口应返回：

```json
{
  "provider": "wps",
  "sdkUrl": "/vendor/web-office-sdk-solution-v1.1.27.umd.js",
  "appId": "your-app-id",
  "fileId": "tenant-document-id",
  "token": { "token": "short-lived-token", "timeout": 600000 },
  "refreshTokenUrl": "/api/editor-sessions/current/refresh",
  "endpoint": "https://o.wpsgo.com",
  "mode": "normal",
  "customArgs": { "ps_task_id": "contract-task-id" }
}
```

## WPS 服务端前置条件

仅有前端 SDK 无法实现真实编辑。WPS 控制台中还需要配置可被 WPS 服务访问的回调网关，并实现文件信息、文件下载、用户信息、用户权限以及三阶段保存接口。文件每次保存后必须生成新版本号。

本地联调可以复制 `.env.example` 为 `.env.local`，配置 WPS SDK、AppID、测试文件 ID 和测试 Token。正式环境应使用 Java 会话接口，不应在前端环境变量中存放长期凭证。
