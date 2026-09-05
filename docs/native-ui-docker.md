# 改造界面 Docker 测试服务

访问地址：<http://localhost:18800/canvas/>。

使用 `docker/compose.native-ui.yml`，复用仓库的 `docker/Dockerfile` 和入口脚本。一体化容器包含本次改造的 Agent Canvas **1.14.0**、官方 Agent Server **1.42.1** 以及 Automation **1.7.1**。

已验证容器内 Agent Server、SDK、Tools、Workspace 均为 **1.42.1**，Automation 为 **1.7.1**；前端页面、设置接口和 Automation 健康接口正常，浏览器可打开模型配置页并刷新。

## 首次使用

在界面的首次配置流程或 Settings → LLM Profiles 中填写模型、API Base URL 和 API Key，再创建会话。服务没有预置模型凭据。

如果模型 API 运行在这台 Mac 上，容器应通过 `host.docker.internal` 访问它；Base URL 的端口和路径沿用该模型服务的配置。容器内的 `localhost` 指容器本身。

外观在 Settings → Application → Color theme 中切换。数据图表来自 Agent 回复中的 Markdown 表格。

## 管理

在仓库根目录执行：

```sh
# 构建当前代码并启动
NATIVE_UI_GIT_SHA=$(git rev-parse HEAD) \
  docker compose -f docker/compose.native-ui.yml up -d --build

# 查看状态和日志
docker compose -f docker/compose.native-ui.yml ps
docker compose -f docker/compose.native-ui.yml logs --tail 100

# 停止 / 再次启动
docker compose -f docker/compose.native-ui.yml stop
docker compose -f docker/compose.native-ui.yml start
```

容器名为 `openhands-native-ui`，镜像为 `openhands-native-ui:1.14.0`。服务只绑定本机 `127.0.0.1:18800`，并配置 `unless-stopped` 重启策略。

## 数据与版本

- `openhands-native-ui_state` 挂载到 `/home/openhands/.openhands`，保存设置、会话、加密密钥和 Automation 数据库。
- `openhands-native-ui_projects` 挂载到 `/projects`，保存工作文件。构建参数 `VITE_WORKING_DIR=/projects` 使新会话默认使用这个持久化目录。
- Session API Key 与设置加密密钥由入口脚本随机生成，保存到状态卷。浏览器访问本地前端时由现有静态服务完成会话认证。
- 此测试部署在构建与运行时关闭产品遥测。
- 修改前端后需重新执行构建启动命令；单纯重启容器不会重新编译前端。
- Dockerfile 在安装 Automation 时同步锁定 Python Agent Server/SDK/Tools/Workspace 版本，避免传递依赖覆盖基础镜像的后端版本。默认版本取自 `config/defaults.json`，也可用 `AGENT_SERVER_VERSION` 构建参数显式指定。
- `docker compose ... down` 保留命名卷；不要删除这两个卷，除非打算清空测试设置、会话和工作文件。
