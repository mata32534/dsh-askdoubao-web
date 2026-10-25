/**
 * settings.mjs —— 设置页 schema（「豆包代替思考」这一组选项）
 * ============================================================================
 * 为什么要单独一个文件、而且是**静态** import：
 *   DSH 判断「一个设置命名空间能不能写」的链路是
 *     configEditor.entries() → entry.fiber.runtime.Config（就是模块导出的 Config）
 *     → volatileForm(schema)（只保留带 volatile 标记的字段）
 *   所以：
 *     ① 必须存在一个 loader entry，其 **id 恰好等于命名空间名**（cordis.patch.yml 里的 id: doubao-web）；
 *     ② 入口模块必须**静态**导出 Config（动态 import 出来的东西 loader 看不到）；
 *     ③ 每个字段都要 `.extra('volatile', true)`，否则整组会被 volatileForm 过滤掉、写不进去。
 *
 * schemastery 的解析：插件是 link: 进 profile 的，Node 会按**真实路径**（工作区）往上找依赖，
 * 找不到 profile 里的 @deepseek-ai/schemastery。所以这里按已知位置逐个试，
 * 全部失败就返回 undefined —— 设置页没有卡片，但插件本体照样能跑。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function profileDir() {
  if (process.env.DSH_PROFILE_DIR) return process.env.DSH_PROFILE_DIR
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'profiles', process.env.DSH_PROFILE || 'desktop')
}

function candidates() {
  const list = []
  const dir = profileDir()
  list.push(path.join(dir, 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs'))
  // 往上找几层，覆盖 pnpm 布局 / 全局安装
  let cur = dir
  for (let i = 0; i < 5; i++) {
    list.push(path.join(cur, 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs'))
    cur = path.dirname(cur)
  }
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  list.push(path.join(home, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'node', 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs'))
  return [...new Set(list)]
}

async function loadSchemastery() {
  try {
    const mod = await import('@deepseek-ai/schemastery')
    if (mod?.default) return mod.default
  } catch { /* 继续试路径 */ }
  for (const file of candidates()) {
    try {
      if (!fs.existsSync(file)) continue
      const mod = await import(pathToFileURL(file).href)
      if (mod?.default) return mod.default
    } catch { /* 下一个 */ }
  }
  return null
}

const z = await loadSchemastery()

export const schemaStatus = z ? 'ok' : 'schemastery-not-found'

/** 每个字段一个开关，全部 volatile（可热改、不用重挂载） */
function field(builder) {
  return builder.extra('volatile', true)
}

export const Config = !z ? undefined : z.object({
  // ── 1. 总开关 ───────────────────────────────────────────────────────────
  // 关掉 = 只贴豆包答复、不自己动手改机器（不影响上面的「自动询问」）。
  enabled: field(z.boolean().default(true).description('自动执行：关掉后仍然每条消息先问豆包、原样贴答复，只是不会自己动手改机器')),

  // ── 2. DS 回答方式 ──────────────────────────────────────────────────────
  //   prefixed = 「我刚问了一下豆包，豆包说：……」+ 豆包原文
  //   excuse   = 先编个理由（懒得思考 / 服务器抽风……）再「所以我去查豆包，豆包说：」+ 原文
  answerMode: field(z.union([z.const('prefixed'), z.const('excuse')]).default('prefixed')
    .description('DS 回答方式：prefixed=「我刚问了一下豆包，豆包说：」+原文；excuse=先编个理由，再「所以我去查豆包，豆包说：」+原文')),

  // ── 3. 自动询问豆包（总闸）──────────────────────────────────────────────
  // 这个开关就是「每条消息都问豆包」的总闸：
  //   开 → 用户的每条指令都先抛给豆包，再把答复原样贴回；
  //   关 → 不主动问，只有用户点名才问。
  autoAsk: field(z.boolean().default(true).description('自动询问：开着时用户的每条指令都先问豆包、再把答复原样贴回；关掉则只有你点名才问')),
  askForComputerOps: field(z.boolean().default(true).description('电脑操作/脚本生成类指令：先问豆包该怎么做，再把它的步骤真的执行掉')),
  confirmBeforeAct: field(z.boolean().default(true).description('每次动手前都先问一句：豆包步骤 + 豆包原话 + 「老大，你看可以吗？」')),

  // ── 4. 窗口与对话 ───────────────────────────────────────────────────────
  showWindow: field(z.boolean().default(true).description('提问时把豆包网页窗口显示出来（关掉=后台静默询问）')),
  newChatEachAsk: field(z.boolean().default(false).description('每次提问都新开一个对话（关掉=复用同一段对话，带上下文）')),

  // ── 5. 细节（一般不用动）────────────────────────────────────────────────
  promptHint: field(z.boolean().default(true).description('在系统提示里加「检索时可以问豆包」的引导')),
  answerTimeoutMs: field(z.natural().default(180000).description('等豆包回答的最长时间（毫秒）')),
  settleMs: field(z.natural().default(1800).description('回答稳定多久算说完（毫秒）')),
  maxAnswerChars: field(z.natural().default(12000).description('回传给模型的回答最大字符数')),
  // 引擎：本机宿主不是 Electron 主进程，auto 会落到 cdp（自己起 Edge + DevTools 协议）
  engine: field(z.union([z.const('auto'), z.const('electron'), z.const('cdp')]).default('auto')
    .description('驱动方式：auto=能内嵌就内嵌、否则起浏览器；electron=用宿主窗口；cdp=自己起 Edge/Chrome')),
})
