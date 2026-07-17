# frontnew WPS 独立工作树说明

## 当前边界

- WPS 编辑区与 Java 业务接口在 frontnew 中并存，左侧保留编辑区，右侧保留风险区。
- 不修改 ContiNew Java、数据库或其他一体机项目。
- 所有业务请求统一由 frontnew 转发到 `continew-java:18000`。
- 当前仓库内的 WPS 回调实现仅用于前端演示，不代表真实上传合同已与 WPS 文件建立映射。

## 路由隔离

frontnew 原有 ContiNew 路由保持不变。制度审校、合同审查和智能问答均使用：

```text
/business/*
```

登录与验证码继续使用：

```text
/api/continew/*
```

部署时 Gateway 和 frontnew 只需加入现有 `agent-internal`，不得发布 Java、Redis 或 PostgreSQL 端口。Caddy 示例见 `deploy/caddy/frontnew-wps.caddy.example`。

## 本地检查

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

接入真实 ContiNew 服务时，设置仅服务端使用的变量：

```text
API_BACKEND_ORIGIN=http://continew-java:18000
```

该地址不能使用 `NEXT_PUBLIC_` 前缀，也不能写入客户端代码。真实 WPS 文件仍要求后端提供与当前合同任务一一对应的编辑会话，并配置可访问的公网回调域名；固定演示文件不能冒充真实上传合同。
