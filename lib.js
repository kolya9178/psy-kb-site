/* 纯函数层：无 DOM，可在 node 里直接测 */
(function (global) {
  'use strict'

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '')
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  /* 把 text 里命中 q 的片段包成 <mark>，先转义再拼，避免注入 */
  function highlight(text, q) {
    const raw = String(text == null ? '' : text)
    const needle = String(q == null ? '' : q).trim()
    if (!needle) return escapeHtml(raw)
    const lower = raw.toLowerCase()
    const nd = needle.toLowerCase()
    let out = '', i = 0
    while (true) {
      const at = lower.indexOf(nd, i)
      if (at < 0) { out += escapeHtml(raw.slice(i)); break }
      out += escapeHtml(raw.slice(i, at)) + '<mark>' + escapeHtml(raw.slice(at, at + nd.length)) + '</mark>'
      i = at + nd.length
    }
    return out
  }

  /* 摘要：命中点前后各 40 字，两端加省略号 */
  function snippet(text, q, span) {
    const raw = String(text == null ? '' : text)
    const n = span || 42
    const at = q ? raw.toLowerCase().indexOf(String(q).trim().toLowerCase()) : -1
    if (at < 0) return raw.length > n * 2 ? raw.slice(0, n * 2) + '…' : raw
    const s = Math.max(0, at - n), e = Math.min(raw.length, at + String(q).length + n)
    return (s > 0 ? '…' : '') + raw.slice(s, e) + (e < raw.length ? '…' : '')
  }

  function scoreKp(kp, q) {
    const nq = norm(q)
    if (!nq) return 0
    let s = 0
    const t = norm(kp.title)
    if (t === nq) s += 200
    else if (t.startsWith(nq)) s += 120
    else if (t.includes(nq)) s += 80
    for (const a of (kp.aliases || [])) {
      const na = norm(a)
      if (na === nq) s += 70
      else if (na.includes(nq)) s += 35
    }
    for (const k of (kp.keywords || [])) {
      const nk = norm(k)
      if (nk === nq) s += 60
      else if (nk.includes(nq)) s += 28
    }
    if (norm(kp.definition).includes(nq)) s += 18
    for (const p of (kp.points || [])) if (norm(p).includes(nq)) { s += 6; break }
    if (norm(kp.section).includes(nq)) s += 4
    return s
  }

  /* 搜索：q 为空返回 []；chapter 为 0/undefined 表示全章 */
  function search(kps, q, chapter) {
    const nq = norm(q)
    if (!nq) return []
    const out = []
    for (const kp of kps) {
      if (chapter && kp.chapter !== chapter) continue
      const s = scoreKp(kp, q)
      if (s > 0) out.push({ kp, score: s })
    }
    out.sort((a, b) => b.score - a.score || a.kp.chapter - b.kp.chapter || a.kp.page_book - b.kp.page_book)
    return out.slice(0, 80)
  }

  /* 在整页原文里定位 quote（忽略空白差异），返回高亮后的 HTML */
  function highlightInPage(text, quote) {
    const raw = String(text == null ? '' : text)
    const q = String(quote == null ? '' : quote).replace(/\s+/g, '')
    if (!q) return { html: escapeHtml(raw), found: false }
    const map = [], buf = []
    for (let i = 0; i < raw.length; i++) {
      if (!/\s/.test(raw[i])) { map.push(i); buf.push(raw[i]) }
    }
    const at = buf.join('').indexOf(q)
    if (at < 0) return { html: escapeHtml(raw), found: false }
    const s = map[at], e = map[at + q.length - 1] + 1
    return {
      html: escapeHtml(raw.slice(0, s)) + '<mark>' + escapeHtml(raw.slice(s, e)) + '</mark>' + escapeHtml(raw.slice(e)),
      found: true,
    }
  }

  global.PsyLib = { norm, escapeHtml, highlight, snippet, search, scoreKp, highlightInPage }
})(typeof window !== 'undefined' ? window : globalThis)
