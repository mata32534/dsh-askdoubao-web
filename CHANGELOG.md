# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.4.0

- **改变回答包装格式**：`excuse` 模式从「我懒得思考，所以…」改成 **「因为（借口），所以我去查豆包，豆包说：」+ 豆包原文**；借口池同步改写成能直接接在「因为」后面的句子。
- 插件包整理成可直接发布到 GitHub 的形态：新增 `LICENSE` / `.gitignore` / `CHANGELOG.md`，自测脚本收进 `test/` 并可通过 `npm test` 跑，README 去掉本机路径。

## 0.3.x

- `autoAsk` 恢复成「每条指令都先问豆包」的**总闸**：开＝每条都问，关＝只有点名才问；原先把它写死成无条件行为是错的。
- 面板上删掉「每条指令都问豆包」的独立开关，与「自动询问」合并成一个入口（页头总闸），卡片里只保留「跟随开启 / 跟随关闭」的状态提示。
- 修复：`enabled=false` 时不再注销工具（以前关一次就点不回来，重启后还会静默失效）。
- 修复：`configEditor` 写入后运行态不生效（改为**运行期以配置文件为准**，写 entry 只是镜像）。
- 修复：改设置会把豆包浏览器杀掉（浏览器进程与插件生命周期解耦，存 `globalThis`，可重连）。

## 0.2.0

- 新增设置页独立面板（`client.js` + `/api/doubao-web/*`）。
- 新增 `answerMode`：`prefixed`（我刚问了一下豆包） / `excuse`（编个理由）。
- 新增 `askForComputerOps` / `confirmBeforeAct`：电脑操作类指令先问豆包，动手前按「老大，你看可以吗？」确认。

## 0.1.0

- 首个可用版本：`doubao_ask` / `doubao_login` / `doubao_status` / `doubao_probe`。
- CDP 驱动网页版豆包：点「新对话」→ 写入问题 → 点发送 → 轮询取正文。
