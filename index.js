/**
 * dsh-doubao-web —— 入口（薄壳）
 * ============================================================================
 * 为什么要有这一层：
 *   Cordis 重载插件时会重新 import 入口模块，但 **Node 的 ESM 模块缓存按 URL 命中**，
 *   同一个路径第二次 import 拿到的是上一次那份代码 —— 改了实现再 disable/enable，
 *   跑的还是旧代码（现象是"改了半天没反应"，本插件开发时踩了半天）。
 *
 *   所以入口只放两样东西：
 *     ① name / inject / Config —— loader 只在 import 时同步读这几样，必须静态导出；
 *     ② apply —— 每次装配都用「实现文件的 mtime」当 query 重新 import 一次实现，
 *        mtime 一变 URL 就变，模块缓存必然穿透。
 *
 *   ⚠️ 入口自己仍然会被缓存：**改了 index.js / settings.mjs 需要重启 DSH 才生效**；
 *      只改 impl.mjs 的话，重载插件（禁用→启用）就够了。
 */
import fs from 'node:fs'
import { Config } from './settings.mjs'

export { Config }
export const name = 'dsh-doubao-web'
// tools 是硬依赖：没有工具注册表，这个插件没有任何意义
export const inject = ['tools']

const IMPL = new URL('./impl.mjs', import.meta.url)

function stamp() {
  try {
    const st = fs.statSync(IMPL)
    return `${Math.round(st.mtimeMs)}-${st.size}`
  } catch {
    return String(Date.now())
  }
}

export async function apply(ctx, config = {}) {
  const url = new URL(`./impl.mjs?v=${stamp()}`, import.meta.url)
  const mod = await import(url.href)
  if (typeof mod.apply !== 'function') throw new Error('impl.mjs 没有导出 apply()')
  return mod.apply(ctx, config)
}
