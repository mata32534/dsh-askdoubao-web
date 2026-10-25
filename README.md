# dsh-doubao-web · 豆包代替思考

让 DeepSeek **把用户的每条指令都先抛给网页版豆包**，再把豆包的回答原样带回来。
回答按设定包装好、`复制粘贴` 级地给到用户，而不是被模型顺手改写。

> 这是一个 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）插件：
> 宿主半端注册 `doubao_*` 工具 + 系统提示，浏览器半端在设置页里画一页独立面板。

---

## 目录结构

```
dsh-doubao-web/
├── package.json        # 插件元数据：dsh.bundle.patch / dsh.client
├── cordis.patch.yml    # 挂载声明（entry id = 设置命名空间 = doubao-web）
├── index.js            # 入口薄壳：静态导出 name/inject/Config，apply 时按 mtime 重载实现
├── impl.mjs            # 全部实现：配置、页面脚本、CDP/Electron 引擎、桥接、工具、设置接口
├── settings.mjs        # 设置页 schema（全是 volatile 字段，可热改）
├── client.js           # 浏览器半端：设置页「豆包代替思考」那一页（手写 loader bundle）
└── test/               # 自测（npm test）
    ├── clean.test.mjs
    ├── settings.test.mjs
    └── client.test.mjs
```

只依赖 Node 内置模块与宿主（不用装任何 npm 依赖）。

---

## 它提供什么

| 工具 | 干什么 |
| --- | --- |
| `doubao_ask` | 把一句话原样抛给网页版豆包，等它答完，返回 `answer`（原文）+ `relay`（已按设置拼好的、可直接发给用户的整段） |
| `doubao_login` | 弹出豆包窗口等扫码登录（登录态持久化，只需一次） |
| `doubao_status` | 看引擎、窗口、登录状态、当前配置 |
| `doubao_probe` | 排障：引擎可用性 + 页面实况（登录墙 / 输入框 / 抓到的回答节点 / data-testid 清单） |

**核心行为**：`autoAsk`（自动询问）开着时，用户的**每一条**指令都先抛给豆包，再把 `relay` 原样贴回；
关掉则只在你点名（「问豆包 / 让豆包看看」）时才问。这两件事是**同一个开关**，没有第二个入口。

电脑操作 / 脚本类指令：先问豆包「具体该怎么做，请给可执行步骤」，再按它的步骤执行；
执行前会按固定格式征得同意（默认每次都要确认）。

---

## 设置页：「豆包代替思考」独立面板

装好之后，**设置 → 侧栏**会多出一页「豆包代替思考」（slot `settings.section`，order 32）。
这是一页自己画的 UI（`client.js`），不是自动生成的 key=value 表单：

- 顶部：**自动询问总闸** + 一排状态胶囊（引擎 / 窗口 / 豆包是否已登录 / 自动执行）
- **「登录与自检」（置顶，三个按钮）**：

  | 按钮 | 干什么 |
  | --- | --- |
  | **在浏览器打开豆包** | 用**系统默认浏览器**打开 `doubao.com/chat`，保证屏幕上一定有反应 |
  | 刷新状态 | 重新读一次引擎 / 窗口 / 登录状态 |
  | 体检（排障） | 抓一次页面实况（输入框、登录墙、回答节点） |

  > 自动提问用的那个 Edge 窗口会在**提问时自己弹出并提到最前**（`showWindow` 开着时），
  > 登录也在它里面扫码；登录态存在独立的 `~/.dsh/doubao-web/browser-profile`，
  > 和你自己的浏览器不共用。窗口独立于插件生命周期：改设置不会关它，闲置 30 分钟才回收。
- 「DS 回答方式」：两张卡片，各自带**样例预览**
- 「自动询问与执行」：「每条指令都先问豆包」在这里只是**跟随状态**（跟着页头总闸），
  下面三个开关分别是电脑操作先问豆包 / 每次动手前确认 / 自动执行
- 「窗口与对话」：显示窗口 / 每次新对话 / 系统提示引导
- 「高级」：超时、稳定窗、字数上限、驱动引擎

### 两种回答方式

| 值 | 给用户看的形态 |
| --- | --- |
| `prefixed` | `我刚问了一下豆包，豆包说：` + 豆包原文 |
| `excuse` | **`因为（随机借口），所以我去查豆包，豆包说：` + 豆包原文**<br>借口池：我想光吃白饭不干活 / 我懒得思考 / 服务器连接失败 / 网络有波动，我思考不了 / 用户没钱供我吃白饭了 |

> 包装是**插件拼好的**，不是让模型自己拼 —— 模型很容易顺手改写豆包的原话。

### 执行前确认的固定话术

（`confirmBeforeAct` 开时，每次真正动手前都要问）

```
豆包给的步骤：
1. … 2. …
豆包是怎么说的：「……」
老大，你看可以吗？
```

### 配置字段

面板管理的字段（也都能在设置页的自动表单里直接改，全部可热改）：

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | 开 | **自动执行**：关掉后照样每条消息先问豆包、照样贴答复，只是不自己动手改机器 |
| `answerMode` | `prefixed` | 回答方式：`prefixed` / `excuse`（见上表） |
| `autoAsk` | 开 | **自动询问总闸**：开＝每条指令都先问豆包；关＝只有点名才问 |
| `askForComputerOps` | 开 | 电脑操作/脚本类指令先问豆包怎么做 |
| `confirmBeforeAct` | 开 | 每次动手前都先问：豆包步骤 + 豆包原话 +「老大，你看可以吗？」 |
| `showWindow` | 开 | 提问时显示豆包窗口（关掉 = 后台静默询问） |
| `newChatEachAsk` | 关 | 每次提问新开一个对话（关掉 = 复用同一对话，带上下文） |
| `promptHint` | 开 | 往系统提示里注入引导 |
| `answerTimeoutMs` | 180000 | 等回答的最长时间 |
| `settleMs` | 1800 | 回答稳定多久算说完 |
| `maxAnswerChars` | 12000 | 回传回答的最大字符数 |
| `engine` | `auto` | 驱动方式：`electron` / `cdp` / `auto` |

面板的读写走 `/api/doubao-web/*`：`config` GET/POST、`status` GET、`open` POST、`open-web` POST、
`login` POST、`probe` GET、`close` POST。写配置时**先落 `~/.dsh/doubao-web/config.json`（运行期真相源）**，
再镜像进 profile 的 loader entry；所以「面板显示的值 = 实际生效的值」，重启前后也一致。

### 浏览器的生命周期（登录不会被设置打断）

踩过的坑：**写设置 → loader 重挂插件 → `dispose()` 把浏览器杀了**，于是「开着窗口扫码，顺手改个选项 → 窗口没了」。

| 事件 | 浏览器的命运 |
| --- | --- |
| 改设置 / 停用→启用插件 / 插件重挂 | **只断开 DevTools 连接，进程留着**；下次用时自动重连同一个窗口（端口 / PID / 目标 id 存在 `globalThis`，能跨模块重载） |
| `POST /api/doubao-web/close` | 真的关掉（唯一的手动关闭入口） |
| 闲置 30 分钟 | 自动关掉；页面脚本执行与面板轮询都算「在用」，所以扫码登录期间绝不会被回收 |
| 浏览器自己崩了 | 下次提问自动重起，登录态还在（`user-data-dir` 持久化） |

---

## 安装

```bash
# 1) 把仓库放到任意目录，例如 ~/plugins/dsh-doubao-web
# 2) 装进 profile（DSH 桌面版也可以用插件管理界面装）
dsh plugin --profile desktop add link:~/plugins/dsh-doubao-web
```

或直接改 `~/.dsh/profiles/desktop/package.json`：

```json
"dependencies": { "dsh-doubao-web": "link:<仓库的绝对路径>" },
"dsh": { "profile": { "bundles": [ "...", "dsh-doubao-web" ] } }
```

然后重启 DSH。**两个地方都要在**：`dependencies` 管安装，`bundles` 管挂载；
只加依赖不加 bundles，重启后插件会消失（工具全 unknown）。

---

## 工作原理（为什么这么实现）

1. **优先用宿主自己的 Chromium**（Electron 主进程里开窗口），不起子进程。
   DSH 的 shell 沙箱禁止子进程创建命名管道，浏览器在里面起不来；插件跑在宿主进程里不受这条限制。
   宿主不是 Electron 主进程时，`auto` 会落到 **CDP 引擎**：自己起一个 Edge（独立 user-data-dir），
   用 DevTools 协议驱动。
2. **不替换全局 `web_search` 提供商**。宿主默认只注册 deepseek 一个提供商，
   再注册一个会让 `web.search` 直接 `WEB_PROVIDER_AMBIGUOUS`，把原来的联网搜索搞坏。
   所以做成独立工具 + 系统提示引导，不动既有检索链路。
3. **不抓流式接口**。豆包网页的对话接口带 msToken / a_bogus 之类签名参数，一升级就废。
   这里走 DOM：点「新对话」→ 写问题 → 点发送 → 轮询「回答文本不再变化」。
4. **页面锚点只认 `data-testid`**（2026-10 实测）：
   `receive_message`（助手消息行）、`message_text_content`（正文节点）、
   `send_message`（用户消息行）、`suggest_message_list`（追问推荐，在正文节点之外）、
   `chat_input_send_button`（发送按钮）、`chat_input_input`（输入区）。

---

## 常见问题

**`NEED_LOGIN` / 页面出现「已达使用上限，请登录以解锁该限制」**
豆包对未登录访客有次数限制。在设置页点「打开窗口登录」或调 `doubao_login`，
在弹出窗口里扫码/手机号登录一次，之后登录态一直留着。

**登录窗口一开就没了 / 改设置后窗口消失**
已修：浏览器进程独立于插件生命周期，改设置只断开 DevTools 连接。
验证方式：`doubao_status` 里的 `engine.pid` 在改设置前后应当是同一个。

**`NO_RESPONSE`**
点发送没反应。先 `doubao_probe` 看页面实况：输入框是否还在、有没有登录墙、
`chat_input_send_button` 是否存在。多半是豆包改版了，对照上面的锚点清单改 `impl.mjs` 里的选择器。

**改了代码没生效**
- `impl.mjs` / `client.js` → 设置里把插件「停用」再「启用」一般就够（`client.js` 还要刷新页面）；
- `index.js` / `settings.mjs` / `package.json` → 入口、schema、插件元数据，**必须重启 DSH**。

  原因是 Node 的 ESM 模块缓存按 URL 命中：同一路径第二次 import 拿到的还是旧代码。
  入口故意做成薄壳，只在 `apply` 时用「`impl.mjs` 的 mtime」当 query 去 import 实现，
  所以实现可以热改，入口不行。

**设置里没有「豆包代替思考」这一页**
1. 确认宿主加载到了新版：`doubao_status` 返回里应有 `build` 字段（当前 `v14`）；
2. 确认 `package.json` 里有 `dsh.client.platform = "web"` 且 `exports["./client"]` 指向 `client.js`；
3. 客户端 bundle 是**启动时扫描**的，新加/改 `client.js` 后要重启 DSH 才会被服务端收录。

---

## 开发与自测

```bash
npm test          # = node test/clean.test.mjs && node test/settings.test.mjs && node test/client.test.mjs
```

- `clean.test.mjs`：回答清洗（去问句回声、去追问推荐/下载横幅、截断）
- `settings.test.mjs`：设置 schema（volatile 字段）+ `formatRelay` / `buildPromptHint` / `buildTurnReminder`
- `client.test.mjs`：客户端半端的槽位注册、面板构造、关键文案、单开关约束

调试用的 `doubao_probe` 工具可以打印页面实况（输入框、登录墙、抓到的回答节点、`data-testid` 清单），
豆包改版时先用它定位。

## License

[MIT](./LICENSE)
