# WPS WebOffice SDK

从 WPS WebOffice 开放平台下载与应用版本匹配的 JSSDK，并由本系统自行托管。

解压后将官方 UMD 文件复制并统一命名为：

`public/vendor/web-office-sdk-solution.umd.js`

SDK 版本必须与 WPS 应用和联调协议匹配。不要复用第三方站点托管的 SDK 地址，
也不要把 WPS AppSecret 或长期 Token 提交到仓库。

当前演示环境固定使用 `v1.1.27 Stable`。版本与来源归档校验记录在
`web-office-sdk-solution.version.txt`；生产 Docker 镜像必须复制 `public/`，否则浏览器
无法加载该 SDK。

`Dockerfile.prebuilt` 仅用于演示机无法访问 npm registry 时的离线恢复路径：必须先在锁文件
兼容的依赖目录中成功执行 `npm run build`，再构建运行镜像。正常环境继续使用根目录
`Dockerfile` 的 `npm ci` 干净构建流程。
