# frontnew WPS 独立工作树说明

## 当前边界

- 仅在 `wps-frontnew-integration` 本地工作树开发。
- 不修改 ProofSpace Java、ContiNew Java、数据库或一体机容器。
- 不推送、部署或合并，直到本地测试与冲突审计完成并由用户确认。
- 第一阶段只验收真实 DOCX 打开与输入修改，不提供智能审查、风险修改、报告或正式版本保存。

## 路由隔离

frontnew 原有 ContiNew 路由保持不变。ProofSpace 合同接口使用：

```text
/proofspace-api/api/v1/*
```

WPS 公有云回调继续使用 Java 已配置的专用域名：

```text
https://wps-callback.cortexdata.cn/proofspace
```

部署时 Gateway 需要同时加入现有 `agent-internal` 与外部 `proofspace-network`，但不得发布 Java、Redis 或 PostgreSQL 端口。Caddy 示例见 `deploy/caddy/frontnew-wps.caddy.example`。

## 本地检查

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

本地接真实 ProofSpace 服务时，可设置仅服务端使用的变量：

```text
PROOFSPACE_BACKEND_ORIGIN=http://127.0.0.1:18080
```

该地址不能使用 `NEXT_PUBLIC_` 前缀，也不能写入仓库。真实 WPS 文件仍要求公网回调域名可访问。
