/**
 * dsh-doubao-web · 浏览器半端（设置页里的「豆包代替思考」独立页面）
 * ============================================================================
 * 这是设置页里的**独立一页**（slot `settings.section`），不是自动生成的 key=value 表单：
 *   · 首页就能看到「引擎 / 窗口 / 登录」实况；
 *   · 「DS 回答方式」用两张卡片，直接给出两种话术的样例；
 *   · 一键打开豆包窗口 / 扫码登录 / 体检，不用回到聊天去敲工具。
 *
 * 数据通路：本页 → POST /api/doubao-web/config → 宿主写回 profile 的 loader entry
 *          （和自动表单同一个真相源）→ 插件按新配置重挂。
 *
 * 注意：这个文件是**手写的 loader bundle**（window.__ModuleLoader__.load），
 * 不是编译产物 —— 只 require('react')，不依赖任何构建步骤。
 */
window.__ModuleLoader__.load({
  id: 'dsh-doubao-web',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback, useRef } = React

    const API = '/api/doubao-web'

    const parse = async (r) => {
      const text = await r.text()
      try { return JSON.parse(text) } catch {
        throw new Error(`接口返回的不是 JSON（HTTP ${r.status}）：${text.slice(0, 120)}`)
      }
    }
    const jget = async (p) => parse(await fetch(API + p, { credentials: 'same-origin' }))
    const jpost = async (p, body) => parse(await fetch(API + p, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    }))

    const CSS = `
      .dbw {
        --dbw-bg: var(--dsw-alias-bg-base, #ffffff);
        --dbw-card: var(--dsw-alias-bg-layer-1, #ffffff);
        --dbw-soft: var(--dsw-alias-bg-layer-2, #f6f7f9);
        --dbw-line: var(--dsw-alias-border-l1, #e5e7eb);
        --dbw-line-2: var(--dsw-alias-border-l2, #d1d5db);
        --dbw-text: var(--dsw-alias-label-primary, #111827);
        --dbw-text-2: var(--dsw-alias-label-secondary, #6b7280);
        --dbw-brand: var(--dsw-alias-brand-primary, #4d6bfe);
        --dbw-ok: var(--dsw-alias-state-success-primary, #15803d);
        --dbw-warn: var(--dsw-alias-state-warn-primary, #b45309);
        --dbw-err: var(--dsw-alias-state-error-primary, #b91c1c);
        padding: 18px 20px 40px;
        max-width: 760px;
        margin: 0 auto;
        color: var(--dbw-text);
        font-size: 13.5px;
        line-height: 1.6;
      }
      .dbw-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
      .dbw-title { font-size: 17px; font-weight: 600; letter-spacing: .2px; }
      .dbw-sub { color: var(--dbw-text-2); font-size: 12.5px; margin-top: 3px; }
      .dbw-card {
        background: var(--dbw-card); border: 1px solid var(--dbw-line);
        border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;
      }
      .dbw-card-hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .dbw-card-hd .dbw-card-t { font-weight: 600; font-size: 13.5px; }
      .dbw-card-hd .dbw-card-d { color: var(--dbw-text-2); font-size: 12px; margin-top: 2px; max-width: 520px; }
      .dbw-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; border-top: 1px solid var(--dbw-line); }
      .dbw-row:first-of-type { border-top: none; }
      .dbw-row-t { font-size: 13px; }
      .dbw-row-d { color: var(--dbw-text-2); font-size: 12px; margin-top: 2px; }
      .dbw-sw { position: relative; width: 42px; height: 24px; flex: 0 0 auto; border-radius: 999px; border: 1px solid var(--dbw-line-2);
        background: var(--dbw-soft); cursor: pointer; transition: background .16s, border-color .16s; padding: 0; }
      .dbw-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
        background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.18); transition: transform .16s; }
      .dbw-sw[data-on="1"] { background: var(--dbw-brand); border-color: var(--dbw-brand); }
      .dbw-sw[data-on="1"]::after { transform: translateX(18px); }
      .dbw-sw:disabled { opacity: .5; cursor: default; }
      .dbw-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .dbw-mode { text-align: left; border: 1px solid var(--dbw-line); background: var(--dbw-soft); border-radius: 12px;
        padding: 10px 12px; cursor: pointer; transition: border-color .16s, box-shadow .16s; }
      .dbw-mode[data-on="1"] { border-color: var(--dbw-brand); box-shadow: 0 0 0 3px rgba(77,107,254,.12); background: var(--dbw-card); }
      .dbw-mode-t { font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .dbw-mode-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--dbw-line-2); flex: 0 0 auto; }
      .dbw-mode[data-on="1"] .dbw-mode-dot { border-color: var(--dbw-brand); background: var(--dbw-brand); box-shadow: inset 0 0 0 2px var(--dbw-card); }
      .dbw-preview { margin-top: 8px; font-size: 12px; color: var(--dbw-text-2); white-space: pre-wrap;
        background: var(--dbw-soft); border: 1px dashed var(--dbw-line); border-radius: 8px; padding: 8px 10px; }
      .dbw-mode[data-on="1"] .dbw-preview { background: var(--dbw-card); }
      .dbw-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .dbw-chip { font-size: 12px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--dbw-line);
        background: var(--dbw-soft); color: var(--dbw-text-2); }
      .dbw-chip[data-tone="ok"] { color: var(--dbw-ok); border-color: color-mix(in srgb, var(--dbw-ok) 35%, transparent); }
      .dbw-chip[data-tone="warn"] { color: var(--dbw-warn); border-color: color-mix(in srgb, var(--dbw-warn) 35%, transparent); }
      .dbw-chip[data-tone="err"] { color: var(--dbw-err); border-color: color-mix(in srgb, var(--dbw-err) 35%, transparent); }
      .dbw-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .dbw-btn { font: inherit; font-size: 12.5px; padding: 6px 12px; border-radius: 9px; cursor: pointer;
        border: 1px solid var(--dbw-line-2); background: var(--dbw-card); color: var(--dbw-text); transition: border-color .16s, background .16s; }
      .dbw-btn:hover:not(:disabled) { border-color: var(--dbw-brand); }
      .dbw-btn[data-kind="primary"] { background: var(--dbw-brand); border-color: var(--dbw-brand); color: #fff; }
      .dbw-btn:disabled { opacity: .55; cursor: default; }
      .dbw-num { width: 88px; text-align: right; }
      .dbw-input { font: inherit; font-size: 12.5px; padding: 5px 8px; border-radius: 8px;
        border: 1px solid var(--dbw-line-2); background: var(--dbw-card); color: var(--dbw-text); }
      .dbw-note { margin-top: 10px; font-size: 12px; color: var(--dbw-text-2); }
      .dbw-err { margin-top: 10px; font-size: 12.5px; color: var(--dbw-err); white-space: pre-wrap; }
      .dbw-toast { position: sticky; bottom: 0; margin-top: 8px; font-size: 12px; padding: 6px 10px; border-radius: 8px;
        background: var(--dbw-soft); color: var(--dbw-text-2); border: 1px solid var(--dbw-line); }
      .dbw-adv { margin-top: 10px; }
      .dbw-adv summary { cursor: pointer; font-size: 12.5px; color: var(--dbw-text-2); }
      @media (max-width: 640px) { .dbw-modes { grid-template-columns: 1fr; } }
    `

    const MODES = [
      {
        id: 'prefixed',
        label: '我刚问了一下豆包',
        desc: '开头加一句「我刚问了一下豆包，豆包说：」，后面接豆包原文',
        preview: '我刚问了一下豆包，豆包说：\n\n向量数据库是专门存储、索引高维向量的数据库……',
      },
      {
        id: 'excuse',
        label: '编个理由再去查豆包',
        desc: '开头是「因为（借口），所以我去查豆包，豆包说：」，借口随机挑（懒得思考 / 服务器抽风 / 没钱吃白饭……）',
        preview: '因为我懒得思考，所以我去查豆包，豆包说：\n\n向量数据库是专门存储、索引高维向量的数据库……',
      },
    ]

    function Switch({ checked, onChange, disabled }) {
      return h('button', {
        type: 'button',
        className: 'dbw-sw',
        'data-on': checked ? '1' : '0',
        'aria-pressed': !!checked,
        disabled: !!disabled,
        onClick: () => { if (!disabled) onChange(!checked) },
      })
    }

    function Row({ title, desc, children }) {
      return h('div', { className: 'dbw-row' }, [
        h('div', { key: 'l' }, [
          h('div', { key: 't', className: 'dbw-row-t' }, title),
          desc ? h('div', { key: 'd', className: 'dbw-row-d' }, desc) : null,
        ]),
        h('div', { key: 'r' }, children),
      ])
    }

    function Panel() {
      const [cfg, setCfg] = useState(null)
      const [status, setStatus] = useState(null)
      const [busy, setBusy] = useState('')
      const [err, setErr] = useState('')
      const [toast, setToast] = useState('')
      const alive = useRef(true)
      useEffect(() => () => { alive.current = false }, [])

      const say = (t) => { setToast(t); setTimeout(() => { if (alive.current) setToast('') }, 2600) }

      const loadConfig = useCallback(async () => {
        try {
          const r = await jget('/config')
          if (alive.current && r.ok) setCfg(r.config)
        } catch (e) { if (alive.current) setErr(String(e.message || e)) }
      }, [])

      const loadStatus = useCallback(async () => {
        try {
          const r = await jget('/status')
          if (alive.current) setStatus(r)
        } catch (e) { if (alive.current) setStatus({ ok: false, error: String(e.message || e) }) }
      }, [])

      useEffect(() => {
        loadConfig()
        loadStatus()
        const t = setInterval(() => {
          if (document.visibilityState === 'visible') loadStatus()
        }, 6000)
        return () => clearInterval(t)
      }, [loadConfig, loadStatus])

      const save = async (patch) => {
        setErr('')
        setCfg((prev) => (prev ? { ...prev, ...patch } : prev))
        try {
          const r = await jpost('/config', patch)
          if (!r.ok) throw new Error(r.error || '保存失败')
          if (alive.current) setCfg(r.config)
          say(r.via === 'configEditor' ? '已保存（写入 profile 配置）' : '已保存（写入本地文件，重启后生效更完整）')
          loadStatus()
        } catch (e) {
          setErr('保存失败：' + String(e.message || e))
          loadConfig()
        }
      }

      const act = async (kind) => {
        setErr('')
        setBusy(kind)
        try {
          if (kind === 'openweb') {
            const r = await jpost('/open-web', {})
            if (!r.ok) throw new Error(r.error || '打开失败')
            say('已用默认浏览器打开豆包网页')
          } else if (kind === 'probe') {
            const r = await jget('/probe')
            say(r.ok ? '体检完成：引擎 ' + ((r.engine && r.engine.kind) || '?') + '，抓到的回答节点 ' + ((r.dom && r.dom.answer && r.dom.answer.sel) || '无') : '体检失败：' + (r.error || ''))
            if (r.ok) setStatus((s) => ({ ...(s || {}), probe: { engine: r.engine, page: r.page, error: r.error } }))
            else setErr('体检失败：' + (r.error || ''))
          }
          loadStatus()
        } catch (e) {
          setErr(String(e.message || e))
        } finally {
          if (alive.current) setBusy('')
        }
      }

      if (!cfg) {
        return h('div', { className: 'dbw' }, [
          h('div', { key: 't', className: 'dbw-title' }, '豆包代替思考'),
          h('div', { key: 's', className: 'dbw-sub' }, '正在读取配置…'),
          err ? h('div', { key: 'e', className: 'dbw-err' }, err) : null,
          h('div', { key: 'h', className: 'dbw-note' },
            '读不到配置的话，多半是宿主还没加载到新版插件：把插件在插件管理里停用→启用一次，或重启 DSH。'),
        ])
      }

      const eng = status && status.engine
      const chips = [
        { label: '引擎 ' + (eng && eng.kind ? eng.kind : '未启动'), tone: eng && eng.running === false && eng.kind === 'cdp' ? 'warn' : '' },
        { label: '窗口 ' + (status && status.windowOpen ? '已打开' : '未打开'), tone: status && status.windowOpen ? 'ok' : '' },
        {
          label: status && status.windowOpen
            ? (status.loggedIn ? '豆包已登录' : (status.loginWall ? '需要登录' : '状态未知'))
            : '豆包未连接',
          tone: status && status.loggedIn ? 'ok' : (status && status.loginWall ? 'err' : ''),
        },
        { label: cfg.autoAsk ? '自动询问：开' : '自动询问：关', tone: cfg.autoAsk ? 'ok' : 'warn' },
        { label: cfg.enabled ? '自动执行：开' : '自动执行：关', tone: cfg.enabled ? 'ok' : 'warn' },
      ]

      // 连接与自检卡片做成变量：它要放在最上面（用户第一步就是看状态）
      const connCard = h('div', { key: 'act', className: 'dbw-card' }, [
        h('div', { key: 'hd', className: 'dbw-card-hd' }, [
          h('div', { key: 'l' }, [
            h('div', { key: 't', className: 'dbw-card-t' }, '登录与自检'),
            h('div', { key: 'd', className: 'dbw-card-d' }, '豆包要在自动窗口里登录（提问时会自己弹出来）；下面按钮只管看网页和排障。'),
          ]),
        ]),
        h('div', { key: 'a', className: 'dbw-actions' }, [
          h('button', { key: 'b0', type: 'button', className: 'dbw-btn', 'data-kind': 'primary', disabled: !!busy, onClick: () => act('openweb') },
            busy === 'openweb' ? '打开中…' : '在浏览器打开豆包'),
          h('button', { key: 'b3', type: 'button', className: 'dbw-btn', disabled: !!busy, onClick: () => { loadStatus(); say('已刷新状态') } }, '刷新状态'),
          h('button', { key: 'b4', type: 'button', className: 'dbw-btn', disabled: !!busy, onClick: () => act('probe') },
            busy === 'probe' ? '体检中…' : '体检（排障）'),
        ]),
        eng && eng.lastError ? h('div', { key: 'e0', className: 'dbw-err' }, '引擎报错：' + eng.lastError) : null,
        status && status.error ? h('div', { key: 'e1', className: 'dbw-err' }, '状态接口报错：' + status.error) : null,
      ])

      return h('div', { className: 'dbw' }, [
        // ── 头部：标题 + 自动询问总闸 ────────────────────────────────────
        h('div', { key: 'hd', className: 'dbw-head' }, [
          h('div', { key: 'l' }, [
            h('div', { key: 't', className: 'dbw-title' }, '豆包代替思考'),
            h('div', { key: 's', className: 'dbw-sub' },
              '自动询问开着时：你说任何话，我第一步都先抛给豆包，再把它的回答原样带回来。'),
          ]),
          h('div', { key: 'r', style: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 } }, [
            h('span', { key: 'l0', className: 'dbw-row-d' }, cfg.autoAsk ? '自动询问：开' : '自动询问：关'),
            h(Switch, {
              key: 'sw',
              checked: !!cfg.autoAsk,
              onChange: (v) => save({ autoAsk: v }),
            }),
          ]),
        ]),
        h('div', { key: 'sd', className: 'dbw-note', style: { marginTop: 0, marginBottom: 10 } },
          cfg.autoAsk
            ? '开：用户的每一条指令都先问豆包，再把豆包答复原样贴回给你。'
            : '关：我不会再主动问豆包；你明确说「问豆包」时才问。'),

        h('div', { key: 'chips', className: 'dbw-chips' }, chips.map((c, i) =>
          h('span', { key: 'c' + i, className: 'dbw-chip', 'data-tone': c.tone || undefined }, c.label))),

        // ── 登录与自检（置顶）─────────────────────────────────────────────
        connCard,

        // ── 回答方式 ───────────────────────────────────────────────────────
        h('div', { key: 'mode', className: 'dbw-card' }, [
          h('div', { key: 'hd', className: 'dbw-card-hd' }, [
            h('div', { key: 'l' }, [
              h('div', { key: 't', className: 'dbw-card-t' }, 'DS 回答方式'),
              h('div', { key: 'd', className: 'dbw-card-d' }, '豆包答完之后，我这边怎么把结果给你。'),
            ]),
          ]),
          h('div', { key: 'm', className: 'dbw-modes' }, MODES.map((m) =>
            h('button', {
              key: m.id,
              type: 'button',
              className: 'dbw-mode',
              'data-on': cfg.answerMode === m.id ? '1' : '0',
              onClick: () => save({ answerMode: m.id }),
            }, [
              h('div', { key: 't', className: 'dbw-mode-t' }, [
                h('span', { key: 'd', className: 'dbw-mode-dot' }),
                h('span', { key: 'x' }, m.label),
              ]),
              h('div', { key: 'd', className: 'dbw-preview' }, m.preview),
            ]))),
        ]),

        // ── 自动询问（总闸在页头；这里只放「怎么执行」）──────────────────
        h('div', { key: 'auto', className: 'dbw-card' }, [
          h('div', { key: 'hd', className: 'dbw-card-hd' }, [
            h('div', { key: 'l' }, [
              h('div', { key: 't', className: 'dbw-card-t' }, '自动询问与执行'),
              h('div', { key: 'd', className: 'dbw-card-d' },
                '页头那个「自动询问」就是总闸：开着时你的每条指令都会先问豆包（这两件事绑在一起，没有第二个开关）。'),
            ]),
          ]),
          h(Row, {
            key: 'r0',
            title: '每条指令都先问豆包',
            desc: cfg.autoAsk ? '已随「自动询问」一起开启' : '已随「自动询问」一起关闭',
          }, h('span', { className: 'dbw-chip', 'data-tone': cfg.autoAsk ? 'ok' : undefined }, cfg.autoAsk ? '跟随开启' : '跟随关闭')),
          h(Row, { key: 'r2', title: '电脑操作 / 脚本类指令先问豆包怎么做', desc: '装环境、写脚本、改配置、批量处理：先要一份可执行步骤，再照着做' },
            h(Switch, { checked: !!cfg.askForComputerOps, disabled: !cfg.autoAsk, onChange: (v) => save({ askForComputerOps: v }) })),
          h(Row, { key: 'r3', title: '每次动手前都先问我', desc: '格式：豆包给的步骤 + 豆包原话 +「老大，你看可以吗？」' },
            h(Switch, { checked: !!cfg.confirmBeforeAct, disabled: !cfg.autoAsk || !cfg.askForComputerOps, onChange: (v) => save({ confirmBeforeAct: v }) })),
          h(Row, { key: 'r4', title: '自动执行（总开关）', desc: '关掉后照样每条先问豆包、照样贴答复，只是不自己动手改机器' },
            h(Switch, { checked: !!cfg.enabled, onChange: (v) => save({ enabled: v }) })),
        ]),

        // ── 窗口与对话 ─────────────────────────────────────────────────────
        h('div', { key: 'win', className: 'dbw-card' }, [
          h('div', { key: 'hd', className: 'dbw-card-hd' }, [
            h('div', { key: 'l' }, [
              h('div', { key: 't', className: 'dbw-card-t' }, '窗口与对话'),
              h('div', { key: 'd', className: 'dbw-card-d' }, '看得见 vs 静默；是否复用同一段对话上下文。'),
            ]),
          ]),
          h(Row, { key: 'r1', title: '提问时显示豆包窗口', desc: '关掉 = 后台静默询问，不打扰你' },
            h(Switch, { checked: !!cfg.showWindow, onChange: (v) => save({ showWindow: v }) })),
          h(Row, { key: 'r2', title: '每次都新开一个对话', desc: '关掉 = 复用同一段对话，豆包能记住前面问过什么' },
            h(Switch, { checked: !!cfg.newChatEachAsk, onChange: (v) => save({ newChatEachAsk: v }) })),
          h(Row, { key: 'r3', title: '在系统提示里加入口引导', desc: '关掉后我不会主动提豆包，只有你点名才用' },
            h(Switch, { checked: !!cfg.promptHint, onChange: (v) => save({ promptHint: v }) })),
        ]),

        // ── 高级 ───────────────────────────────────────────────────────────
        h('details', { key: 'adv', className: 'dbw-adv' }, [
          h('summary', { key: 's' }, '高级（超时 / 稳定窗 / 字数上限 / 引擎）'),
          h('div', { key: 'c', className: 'dbw-card', style: { marginTop: 10 } }, [
            h(Row, { key: 'r1', title: '等回答超时（毫秒）', desc: '超过这个时间还没答完就报超时' },
              h('input', {
                key: 'i', className: 'dbw-input dbw-num', type: 'number', min: 15000, max: 600000, step: 5000,
                defaultValue: cfg.answerTimeoutMs,
                onBlur: (e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v !== cfg.answerTimeoutMs) save({ answerTimeoutMs: v })
                },
              })),
            h(Row, { key: 'r2', title: '回答稳定判定（毫秒）', desc: '文本多久不变就认为答完了' },
              h('input', {
                key: 'i', className: 'dbw-input dbw-num', type: 'number', min: 600, max: 8000, step: 100,
                defaultValue: cfg.settleMs,
                onBlur: (e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v !== cfg.settleMs) save({ settleMs: v })
                },
              })),
            h(Row, { key: 'r3', title: '回传最大字数', desc: '超过就截断并注明' },
              h('input', {
                key: 'i', className: 'dbw-input dbw-num', type: 'number', min: 500, max: 60000, step: 500,
                defaultValue: cfg.maxAnswerChars,
                onBlur: (e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v !== cfg.maxAnswerChars) save({ maxAnswerChars: v })
                },
              })),
            h(Row, { key: 'r4', title: '驱动引擎', desc: '本机宿主不是 Electron 主进程，auto 会落到 cdp（自己起 Edge）' },
              h('select', {
                key: 's', className: 'dbw-input', defaultValue: cfg.engine,
                onChange: (e) => save({ engine: e.target.value }),
              }, [
                h('option', { key: 'auto', value: 'auto' }, 'auto'),
                h('option', { key: 'cdp', value: 'cdp' }, 'cdp'),
                h('option', { key: 'electron', value: 'electron' }, 'electron'),
              ])),
          ]),
        ]),

        err ? h('div', { key: 'err', className: 'dbw-err' }, err) : null,
        toast ? h('div', { key: 'toast', className: 'dbw-toast' }, toast) : null,
        h('div', { key: 'note', className: 'dbw-note' },
          '提示：这里的开关会写进 profile 的插件配置（与设置页自动表单同一份），改完立刻生效。'),
      ])
    }

    class Boundary extends React.Component {
      constructor(p) { super(p); this.state = { error: null } }
      static getDerivedStateFromError(error) { return { error } }
      render() {
        if (this.state.error) {
          return h('div', { className: 'dbw' }, [
            h('div', { key: 't', className: 'dbw-title' }, '豆包代替思考'),
            h('div', { key: 'e', className: 'dbw-err' }, '面板崩了：' + String(this.state.error && this.state.error.message || this.state.error)),
          ])
        }
        return this.props.children
      }
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const style = document.createElement('style')
        style.setAttribute('data-plugin-css', 'dsh-doubao-web')
        style.textContent = CSS
        document.head.appendChild(style)
        try { ctx.effect(() => () => style.remove(), 'dsh-doubao-web: 设置页样式') } catch { /* 老版本没有 effect */ }

        const slots = (typeof ctx.get === 'function' ? ctx.get('slots') : undefined) || ctx.slots
        if (!slots) return
        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'doubao-web', order: 32, label: '豆包代替思考' },
          () => h(Boundary, null, h(Panel)),
        ))
      },
    }
  },
})
