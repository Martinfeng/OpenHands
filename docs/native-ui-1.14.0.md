# Agent Canvas 1.14.0 外观改造

开发分支：`codex/native-ui-1.14.0`，基线：`c0ba9e6d2b73dca07fe1127b91c1eff719853846`。

## 版本与接口

| 组件              | 固定版本 |
| ----------------- | -------- |
| Agent Canvas      | 1.14.0   |
| Agent Server      | 1.42.1   |
| TypeScript Client | 1.38.0   |
| Extensions        | 0.16.0   |
| Automation        | 1.7.1    |

保留 React、Vite、Tailwind、HeroUI、Framer Motion、Zustand 和 React Query。生产代码中的 API 服务、认证、会话创建请求、WebSocket 协议及后端设置字段未变更。主题偏好不写入 Agent Server。

## 使用与实现

- 在设置 → Application → Color theme 中选择浅色、深色或跟随系统。独立应用默认跟随系统，偏好保存在 `localStorage["openhands-appearance"]`。Electron 同步原生窗口颜色，并在自身用户目录保存启动外观。
- 颜色通过语义变量覆盖主要页面、菜单、输入框、弹层、Markdown、代码、Monaco/Diff 和终端。HeroUI 下拉层传送到 `body`，因此 `--heroui-*` 也写在外观根上，浅色模式的弹出菜单才能继承浅色底和深色字。系统字体优先使用 macOS 字体，蓝色用于主要操作与焦点。
- 同一轮回复采用较紧凑的间距：Agent 文本块上边距为 8px，工具和思考区块保留 4px 内边距并去除重复外边距，配合消息列表的 8px 间隔形成约 12px 的说明到操作间距、约 20px 的操作到下一阶段间距。用户消息保留 24px 上边距，区分不同轮对话；正文行距不变。
- 嵌入组件仍由 `AgentServerUIProviders` / `AgentServerUIRoot` 的 `theme`、`styleOverrides` 和 `style` 控制，宿主覆盖优先于默认变量；独立应用的本地主题选择不会接管嵌入组件。
- 独立应用的 `body` 显式使用 `color: var(--oh-foreground)`，避免浅色模式继续继承上层已解析的深色文字色。此处使用内联语义变量，因为构建后的文字颜色工具类只匹配作用域内的后代，不能匹配 `body` 作用域根本身。
- 活动标题流光在浅色模式使用 `#555b65` 底字和 `#ffffff` 光带，深色模式使用 `#a3aab5` 底字和 `#ffffff` 光带。两个模式统一使用白色高光和 500 字重。光带半宽约 `5.2ch`（贴近 Codex TUI 的 5 字符半宽与 OpenCode 的 `--spread: 5.2ch`）；渐变画布为文字宽度的 3.6 倍，光带进出都出界，线性无限循环。等待空档的中文文案为「正在思考」，比「思考中」更长，扫光更完整。一轮固定 2 秒（与 Codex TUI `sweep_seconds = 2` 相同），短标题看起来慢、长标题看起来快。
- 回复不加入重复的身份与版本块。流光跟随当前未完成的工具或思考标题，旧标题恢复静态；折叠的工具组由组标题承载唯一流光。正文直接呈现真实增量，不播放流光。只有没有可用活动标题的等待空档，才在消息流中显示临时“正在思考”，不固定在回复开头或视口底部。等待审批、断线、停止、完成及错误状态不播放流光，系统减少动态效果时显示静态文字。
- 响应动效的位置规则参考 Codex TUI `shimmer.rs`（文字两侧各约 10 个字符的行程、固定 2 秒一轮、无停顿）和 OpenCode TextShimmer（`360%` 画布、线性循环）。初始延迟约 0.1 秒。这不是对所有正文施加流光。OpenCode 的 [BasicTool](https://github.com/anomalyco/opencode/blob/dev/packages/session-ui/src/components/basic-tool.tsx) 同样仅在工具 pending/running 时激活标题流光。
- 审批继续使用现有确认接口，支持同意、拒绝及键盘快捷键。提交期间禁止重复提交；失败后保留审批入口，可重新操作。失败提示与会话及待审批事件绑定。
- Markdown 保留 GFM、原有代码高亮及 HTML 清洗。Agent 公式通过受限清洗后交给 KaTeX，`trust: false`；错误公式保留可读内容。
- Agent 的 Markdown 表格默认展示原表，可切换折线、柱状、散点图和展开视图。图表仅从表格解析结果生成，不执行消息中的 JavaScript 或任意图表配置，不读取文件或导入数据。
- X 默认首列，Y 默认前两个可用数值列（排除 X）。保留行序和缺失值，散点图要求数值 X/Y；百分数、单位、千位分隔符、非有限值及不安全整数不进行猜测转换。上限为 5,000 行、50 列、6 个系列，超限或无法可靠解析时保留原表并说明原因。
- ECharts 按需加载；生产构建将 ECharts 与 zrender 放在同一个异步包中，避免原有按大小分包造成初始化顺序错误。

新增依赖均精确锁定：`remark-math@6.0.0`、`rehype-katex@7.0.1`、`katex@0.16.47`、`echarts@6.0.0`。

## 验证

2026-09-05 验证结果：

| 检查                                  | 结果                                               |
| ------------------------------------- | -------------------------------------------------- |
| `npm run lint`                        | 通过；0 个错误，3 个基线已有警告                   |
| `npm test`                            | 573 个文件通过；4,702 项通过、5 项跳过、7 项待实现 |
| `npm run build` / `npm run build:lib` | 均通过                                             |
| 真实 Agent Server 1.42.1 + 脚本模型   | 7 项浏览器集成测试全部通过                         |
| macOS Electron                        | 启动主题、三种外观、原生背景与重载检查通过         |

单元测试使用 Node 24.19.0。Node 26 的全局 localStorage 行为与本基线的部分测试环境不兼容，因此不以 Node 26 的测试结果作为验收依据。

```sh
npm run lint
npm test
npm run build
npm run build:lib
```

浏览器后端联调复用仓库的 mock-LLM 框架，启动真实 Agent Server 1.42.1 和 Automation 1.7.1，仅模型回复使用脚本控制，不需要真实 LLM 凭据：

```sh
OH_CANVAS_SAFE_VITE_PORT=18302 MOCK_LLM_PORT=19999 \
MOCK_LLM_PYTHON=.tmp/ui-qa-python/bin/python \
npm run test:e2e:mock-llm -- \
  tests/e2e/mock-llm/conversations/mock-llm-conversation.spec.ts \
  tests/e2e/mock-llm/conversations/native-ui.spec.ts
```

Python 环境需安装 `openhands-sdk==1.42.1`，浏览器需执行 `npx playwright install chromium`。测试端口应保持空闲。基线测试的 LLM profiles 位于测试状态目录的父目录；重复运行固定名称的 profile 创建用例前，需使用新的隔离环境或清理自己先前生成的测试 profile。

新增用例覆盖审批失败重试、真实工具执行与拒绝、断线恢复、停止和继续、公式、图表、主题切换、展开视图焦点返回、响应期间减少动态效果及 360px 窄屏。测试框架单独响应 SDK 的后台标题生成请求，避免它消耗会话的脚本回复；停止测试使用有界延迟的模型回复，确保中断发生在真实请求仍运行时。

Electron 使用实际 `electron/main.mjs` 和 preload，在隔离的 userData/后端状态目录中核对启动深色、浅色/深色/系统切换、窗口背景及页面重载。该验证针对 macOS 开发运行；未生成签名安装包，也未声称完成 Windows/Linux 的桌面验收。

本次验证不调用真实商业模型。真实后端的协议与交互已纳入集成检查，具体模型服务的延迟、长时间训练任务及外部 MCP 行为不属于本次 UI 回归范围。

### 当前活动标题流光修订（2026-09-05）

修订后 `npm run lint`、应用构建和库构建通过；聊天事件、状态提示及流光组件相关 22 个测试文件、237 项单元测试通过（1 项既有待实现）。真实 Agent Server 1.42.1 的 4 项 native UI 用例通过，覆盖长会话中的新工具标题进入视口、工具组折叠/展开时仅一处流光、结束后清除、审批、拒绝、断线、停止、继续和减少动态效果。长会话用例在修正脚本模型的轮次安排后单独补跑通过。
