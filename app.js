(function () {
  'use strict'

  const D = window.__PSY__ || { meta: {}, chapters: [], kps: [], confusable: [] }
  const L = window.PsyLib
  const PAGES = window.__PAGES__ || {}
  const PDF_URL = '' // 部署后填 PDF 地址，例如 'files/psy.pdf'

  const byId = new Map(D.kps.map(k => [k.id, k]))
  const pairByKey = new Map(D.confusable.map(p => [p.a + '|' + p.b, p]))
  const view = document.getElementById('view')
  const topSub = document.getElementById('topSub')
  const tabbar = document.getElementById('tabbar')
  const sheet = document.getElementById('sheet')
  const sheetTitle = document.getElementById('sheetTitle')
  const sheetMeta = document.getElementById('sheetMeta')
  const sheetBody = document.getElementById('sheetBody')

  const state = { openCh: new Set(), q: '', ch: 0, pairCh: 0, pairQ: '' }
  const esc = L.escapeHtml

  /* ---------- 小工具 ---------- */

  function chapterOf(k) { return D.chapters[k.chapter - 1] }

  /* chapters.json 的节名没有「第一节」前缀，知识点里带前缀，比较前先归一 */
  function normSec(s) {
    return String(s || '').replace(/^第[一二三四五六七八九十百]+节\s*/, '').trim()
  }
  function secIndexOf(chapterNo, sectionTitle) {
    const c = D.chapters[chapterNo - 1]
    if (!c) return -1
    const key = normSec(sectionTitle)
    return (c.sections || []).findIndex(s => normSec(s.title) === key)
  }
  function kpsOfSection(chapterNo, idx) {
    const c = D.chapters[chapterNo - 1]
    const s = c && (c.sections || [])[idx]
    if (!s) return []
    const key = normSec(s.title)
    return D.kps.filter(k => k.chapter === chapterNo && normSec(k.section) === key)
  }

  function pairKey(a, b) { return [a, b].sort().join('|') }

  function pairLink(a, b, cls) {
    const [x, y] = [a, b].sort()
    return `<a class="${cls || 'chip'}" href="#/pair/${x}/${y}">对比</a>`
  }

  function setTab(name) {
    tabbar.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === name))
  }

  function parseHash(input) {
    const raw = (input !== undefined ? input : location.hash).replace(/^#/, '') || '/chapters'
    const [path, qs] = raw.split('?')
    return { seg: path.split('/').filter(Boolean), params: new URLSearchParams(qs || '') }
  }

  /* 不依赖浏览器的默认 # 跳转：某些内嵌预览会拦截链接，这里自己接管 */
  function go(href) {
    const before = location.hash || ''
    try { location.hash = href } catch (e) { /* 沙箱里可能不允许改 hash */ }
    if ((location.hash || '') === before) render(href)
  }

  document.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#/"]') : null
    if (!a) return
    e.preventDefault()
    e.stopPropagation()
    go(a.getAttribute('href'))
  }, true)

  /* ---------- 路由 ---------- */

  let lastHash = ''
  function render(input) {
    lastHash = input !== undefined ? input : location.hash
    const { seg } = parseHash(input)
    const head = seg[0] || 'chapters'
    try { window.scrollTo(0, 0) } catch (e) {}
    if (head === 'kp') return renderKp(decodeURIComponent(seg[1] || ''))
    if (head === 'sec') return renderSection(Number(seg[1]), Number(seg[2]))
    if (head === 'search') return renderSearch()
    if (head === 'pairs') return renderPairs()
    if (head === 'pair') return renderPair(seg[1] || '', seg[2] || '')
    if (head === 'graph') return renderGraph(seg[1] ? decodeURIComponent(seg[1]) : '')
    if (head === 'map') return renderMap()
    return renderChapters()
  }

  /* ---------- 章节 ---------- */

  function renderChapters() {
    setTab('chapters')
    topSub.textContent = `${D.meta.chapters} 章 · ${D.meta.kps} 个知识点 · ${D.meta.pairs} 对易混`
    const cards = D.chapters.map((c, i) => {
      const no = i + 1
      const open = state.openCh.has(no)
      const secs = (c.sections || []).map((s, j) =>
        `<a class="sec" href="#/sec/${no}/${j}">
           <span class="s-t">${esc(s.title)}</span>
           <span class="s-n">书 ${s.book_page} 页</span>
         </a>`).join('')
      return `<section class="card ch${open ? ' open' : ''}">
        <button class="ch-head" data-toggle="${no}" aria-expanded="${open}">
          <span class="badge">${esc(c.num_cn || String(no))}</span>
          <span class="t"><b>${esc(c.title)}</b><span>书 ${c.book_page} 页起 · ${c.kp_count} 个知识点</span></span>
          <span class="arrow">›</span>
        </button>
        <div class="ch-body"${open ? '' : ' hidden'}>${secs}</div>
      </section>`
    }).join('')
    view.innerHTML = `<div class="section-title">全书目录</div>${cards}`
    view.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const no = Number(btn.dataset.toggle)
        state.openCh.has(no) ? state.openCh.delete(no) : state.openCh.add(no)
        renderChapters()
      })
    })
  }

  function renderSection(chNo, secIdx) {
    setTab('chapters')
    const c = D.chapters[chNo - 1]
    if (!c) return renderChapters()
    const s = (c.sections || [])[secIdx]
    if (!s) return renderChapters()
    const kps = kpsOfSection(chNo, secIdx)
    const rows = kps.map(k => `
      <a class="kp-row" href="#/kp/${k.id}">
        <div class="k-t">${esc(k.title)}</div>
        <div class="k-d">${esc(k.definition)}</div>
        <div class="k-p">书 ${k.page_book} 页 · ${(k.confusable || []).length} 个易混</div>
      </a>`).join('')
    topSub.textContent = `第 ${chNo} 章 · ${s.title}`
    view.innerHTML = `
      <div class="crumb"><a href="#/chapters">章节</a> › 第 ${chNo} 章 ${esc(c.title)}</div>
      <div class="section-title">${esc(s.title)} · ${kps.length} 个知识点</div>
      <div class="card">${rows || '<div class="empty">这一节没有知识点</div>'}</div>`
  }

  /* ---------- 知识点详情 ---------- */

  function renderKp(id) {
    const k = byId.get(id)
    if (!k) { view.innerHTML = '<div class="empty">找不到这个知识点</div>'; return }
    setTab('chapters')
    const partners = (k.confusable || []).map(x => byId.get(x)).filter(Boolean)
    const tags = (k.tags || []).map(t => `<span class="tag${/高频|易错|易混/.test(t) ? ' hot' : ''}">${esc(t)}</span>`).join('')
    const points = (k.points || []).map(p => `<li>${esc(p)}</li>`).join('')
    const ex = (k.examples || []).length
      ? `<div class="examples"><b>例子</b>：${esc(k.examples.join('；'))}</div>` : ''
    const kw = [...new Set([...(k.keywords || []), ...(k.aliases || [])])]
      .filter(x => x && x !== k.title)
      .slice(0, 6)
      .map(x => `<span class="chip">${esc(x)}</span>`).join('')
    const partnerChips = partners.length
      ? partners.map(p => `<a class="chip" href="#/pair/${[k.id, p.id].sort()[0]}/${[k.id, p.id].sort()[1]}">${esc(p.title)}</a>`).join('')
      : '<span class="hint">这条没有易混对象（纯描述性知识点）</span>'
    const btns = []
    if (partners.length) btns.push(`<a class="btn primary" href="#/pair/${[k.id, partners[0].id].sort()[0]}/${[k.id, partners[0].id].sort()[1]}">对照易混</a>`)
    btns.push(`<button class="btn" data-page="${k.id}">第 ${k.page_book} 页原文</button>`)
    btns.push(`<a class="btn ghost" href="#/graph/${k.id}">关系图</a>`)

    topSub.textContent = `第 ${k.chapter} 章 · ${k.section}`
    view.innerHTML = `
      <div class="crumb"><a href="#/chapters">章节</a> › <a href="#/sec/${k.chapter}/${secIndexOf(k.chapter, k.section)}">${esc(k.section)}</a></div>
      <h1 class="kp-title">${esc(k.title)}</h1>
      <div>${tags}</div>
      <div class="def-block">${esc(k.definition)}</div>
      <ol class="points">${points}</ol>
      ${ex}
      <div class="kv">${kw}</div>
      <div class="section-title">易混</div>
      <div class="kv">${partnerChips}</div>
      ${k.distinction ? `<div class="distinction"><b>区分判据</b>${esc(k.distinction)}</div>` : ''}
      <div class="section-title">原文（书 ${k.page_book} 页 / pdf ${k.page_pdf} 页）</div>
      <div class="quote">${esc(k.quote)}</div>
      <div class="btn-row">${btns.join('')}</div>`

    view.querySelector('[data-page]')?.addEventListener('click', () => openPage(k))
  }

  /* ---------- 搜索 ---------- */

  function renderSearch() {
    setTab('search')
    const fromUrl = parseHash(lastHash).params.get('q')
    if (fromUrl) state.q = fromUrl
    topSub.textContent = '搜索 593 个知识点'
    const opts = D.chapters.map((c, i) => `<option value="${i + 1}">第 ${i + 1} 章 ${esc(c.title)}</option>`).join('')
    view.innerHTML = `
      <div class="searchbar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="q" type="search" placeholder="搜概念、术语、人名…" autocomplete="off" value="${esc(state.q)}">
        <button class="clr" id="clr" aria-label="清空">×</button>
      </div>
      <div class="chip-row" style="margin-top:10px">
        <select id="chSel" class="chip" style="appearance:none">
          <option value="0">全部章节</option>${opts}
        </select>
      </div>
      <div id="results"></div>`
    const q = view.querySelector('#q')
    const sel = view.querySelector('#chSel')
    sel.value = String(state.ch || 0)
    const run = () => {
      state.q = q.value
      state.ch = Number(sel.value) || 0
      renderResults()
    }
    q.addEventListener('input', run)
    sel.addEventListener('change', run)
    view.querySelector('#clr').addEventListener('click', () => { q.value = ''; run(); q.focus() })
    renderResults()
    if (!state.q) q.focus({ preventScroll: true })
  }

  function renderResults() {
    const box = document.getElementById('results')
    if (!box) return
    const q = state.q.trim()
    if (!q) {
      box.innerHTML = `<div class="hint">输入关键词，标题、别名、关键词、定义都参与匹配。</div>
        <div class="sugg">
          ${['韦伯定律', '组块', '大五人格', '错觉', '依恋', '自我效能感'].map(s => `<button class="chip" data-s="${s}">${s}</button>`).join('')}
        </div>`
      box.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
        const input = document.getElementById('q'); input.value = b.dataset.s; state.q = b.dataset.s; renderResults()
      }))
      return
    }
    const hits = L.search(D.kps, q, state.ch)
    if (!hits.length) {
      box.innerHTML = `<div class="empty">没有命中 <b>${esc(q)}</b>，换个说法试试。</div>`
      return
    }
    box.innerHTML = `<div class="hint">${hits.length} 条结果${state.ch ? '（限第 ' + state.ch + ' 章）' : ''}</div>
      <div class="card">${hits.map(({ kp }) => `
        <a class="kp-row" href="#/kp/${kp.id}">
          <div class="k-t">${L.highlight(kp.title, q)}</div>
          <div class="k-d">${L.highlight(L.snippet(kp.definition, q, 36), q)}</div>
          <div class="k-p">第 ${kp.chapter} 章 · 书 ${kp.page_book} 页</div>
        </a>`).join('')}</div>`
  }

  /* ---------- 易混 ---------- */

  function renderPairs() {
    setTab('pairs')
    topSub.textContent = `${D.meta.pairs} 对易混 · 每对一句话判据`
    const chips = [`<button class="chip${state.pairCh === 0 ? ' on' : ''}" data-ch="0">全部</button>`]
      .concat(D.chapters.map((c, i) => `<button class="chip${state.pairCh === i + 1 ? ' on' : ''}" data-ch="${i + 1}">${i + 1} ${esc(c.title.slice(0, 4))}</button>`))
      .join('')
    view.innerHTML = `
      <div class="chip-row">${chips}</div>
      <div class="searchbar" style="margin:10px 0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="pq" type="search" placeholder="按标题过滤，如 恒常、注意" value="${esc(state.pairQ)}" autocomplete="off">
      </div>
      <div id="plist"></div>`
    const pq = view.querySelector('#pq')
    pq.addEventListener('input', () => { state.pairQ = pq.value; renderPairList() })
    view.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => {
      state.pairCh = Number(b.dataset.ch)
      renderPairs()
    }))
    renderPairList()
  }

  function renderPairList() {
    const box = document.getElementById('plist')
    if (!box) return
    const q = state.pairQ.trim().toLowerCase()
    let list = D.confusable
    if (state.pairCh) list = list.filter(p => {
      const ca = byId.get(p.a)?.chapter, cb = byId.get(p.b)?.chapter
      return ca === state.pairCh || cb === state.pairCh
    })
    if (q) list = list.filter(p => (p.a_title + p.b_title + p.distinction).toLowerCase().includes(q))
    if (!list.length) { box.innerHTML = '<div class="empty">没有符合条件的易混对</div>'; return }
    box.innerHTML = `<div class="hint">${list.length} 对</div><div class="card">${list.map(p => `
      <a class="pair-row" href="#/pair/${p.a}/${p.b}">
        <div class="p-t">${esc(p.a_title)}<span class="vs">↔</span>${esc(p.b_title)}</div>
        <div class="p-d">${esc(p.distinction)}</div>
        <div class="p-c">第 ${byId.get(p.a)?.chapter || '?'} 章 · 书 ${byId.get(p.a)?.page_book || '?'} 页</div>
      </a>`).join('')}</div>`
  }

  function renderPair(a, b) {
    setTab('pairs')
    const key = pairKey(a, b)
    const pair = pairByKey.get(key)
    const ka = byId.get(a), kb = byId.get(b)
    if (!ka || !kb) { view.innerHTML = '<div class="empty">找不到这对知识点</div>'; return }
    const card = (k) => `
      <div class="pair-card">
        <h3><a href="#/kp/${k.id}">${esc(k.title)}</a></h3>
        <div class="pc-def">${esc(k.definition)}</div>
        <ul class="pc-pt">${(k.points || []).slice(0, 3).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="pc-pg">第 ${k.chapter} 章 · 书 ${k.page_book} 页 / pdf ${k.page_pdf} 页</div>
      </div>`
    topSub.textContent = `${ka.title} ↔ ${kb.title}`
    view.innerHTML = `
      <div class="crumb"><a href="#/pairs">易混</a> › 对比</div>
      <div class="compare">${card(ka)}${card(kb)}</div>
      <div class="distinction"><b>区分判据</b>${esc((pair && pair.distinction) || ka.distinction || kb.distinction || '（这对还没有判据）')}</div>
      <div class="btn-row">
        <a class="btn" href="#/graph/${ka.id}">以「${esc(ka.title)}」为中心</a>
        <a class="btn ghost" href="#/pairs">返回列表</a>
      </div>`
  }

  /* ---------- 关系图 ---------- */

  function hubId() {
    let best = D.kps[0], n = -1
    for (const k of D.kps) {
      const c = (k.confusable || []).length
      if (c > n) { n = c; best = k }
    }
    return best ? best.id : ''
  }

  function trunc(s, n) { return s.length > n ? s.slice(0, n) + '…' : s }

  function graphSvg(centerId) {
    const center = byId.get(centerId)
    if (!center) return ''
    const ring1 = (center.confusable || []).map(x => byId.get(x)).filter(Boolean).slice(0, 12)
    const r1ids = new Set(ring1.map(k => k.id))
    const CX = 240, CY = 240, R1 = 105, R2 = 170
    const nodes = [], edges = []
    nodes.push(`<g class="node center"><circle cx="${CX}" cy="${CY}" r="26"></circle>
      <text x="${CX}" y="${CY + 4}" text-anchor="middle">${esc(trunc(center.title, 3))}</text>
      <title>${esc(center.title)}</title></g>`)
    ring1.forEach((k, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(ring1.length, 1)
      const x = CX + R1 * Math.cos(ang), y = CY + R1 * Math.sin(ang)
      edges.push(`<line class="edge" x1="${CX}" y1="${CY}" x2="${x}" y2="${y}"></line>`)
      const anchor = Math.cos(ang) > 0.3 ? 'start' : Math.cos(ang) < -0.3 ? 'end' : 'middle'
      const dx = anchor === 'start' ? 26 : anchor === 'end' ? -26 : 0
      const dy = Math.abs(Math.cos(ang)) <= 0.3 ? (Math.sin(ang) > 0 ? 34 : -24) : 4
      nodes.push(`<g class="node ring1" data-id="${k.id}">
        <circle cx="${x}" cy="${y}" r="19"></circle>
        <text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}">${esc(trunc(k.title, 4))}</text>
        <title>${esc(k.title)}</title></g>`)
      const kids = (k.confusable || []).map(x => byId.get(x))
        .filter(x => x && x.id !== centerId && !r1ids.has(x.id)).slice(0, 2)
      kids.forEach((kid, j) => {
        const spread = (j - (kids.length - 1) / 2) * 16
        const ka = ang + spread * Math.PI / 180
        const kx = CX + R2 * Math.cos(ka), ky = CY + R2 * Math.sin(ka)
        edges.push(`<line class="edge faint" x1="${x}" y1="${y}" x2="${kx}" y2="${ky}"></line>`)
        const ka2 = Math.cos(ka) > 0.3 ? 'start' : Math.cos(ka) < -0.3 ? 'end' : 'middle'
        const kdx = ka2 === 'start' ? 20 : ka2 === 'end' ? -20 : 0
        const kdy = Math.abs(Math.cos(ka)) <= 0.3 ? (Math.sin(ka) > 0 ? 26 : -18) : 4
        nodes.push(`<g class="node ring2" data-id="${kid.id}">
          <circle cx="${kx}" cy="${ky}" r="13"></circle>
          <text x="${kx + kdx}" y="${ky + kdy}" text-anchor="${ka2}">${esc(trunc(kid.title, 3))}</text>
          <title>${esc(kid.title)}</title></g>`)
      })
    })
    return `<svg viewBox="0 0 480 480" role="img" aria-label="易混关系图">${edges.join('')}${nodes.join('')}</svg>`
  }

  function renderGraph(id) {
    setTab('pairs')
    const centerId = byId.has(id) ? id : hubId()
    const center = byId.get(centerId)
    topSub.textContent = `关系图 · ${center ? center.title : ''}`
    view.innerHTML = `
      <div class="crumb"><a href="#/pairs">易混</a> › 关系图</div>
      <div class="searchbar" style="margin-bottom:10px">
        <input id="gc" type="search" placeholder="换一个中心：输入知识点名" autocomplete="off">
      </div>
      <div id="gsugg"></div>
      <div class="graph-wrap">${graphSvg(centerId)}</div>
      <div class="hint" style="text-align:center">点节点换中心 · ${(center.confusable || []).length} 个直接易混</div>
      <div class="btn-row" style="justify-content:center">
        <a class="btn" href="#/kp/${centerId}">打开「${esc(center.title)}」</a>
      </div>`
    view.querySelectorAll('.node[data-id]').forEach(n => n.addEventListener('click', () => go('#/graph/' + n.dataset.id)))
    const input = view.querySelector('#gc')
    const sugg = view.querySelector('#gsugg')
    input.addEventListener('input', () => {
      const q = input.value.trim()
      if (!q) { sugg.innerHTML = ''; return }
      const hits = L.search(D.kps, q, 0).slice(0, 6)
      sugg.innerHTML = hits.map(({ kp }) => `<button class="chip" data-id="${kp.id}" style="margin:0 6px 6px 0">${esc(kp.title)}</button>`).join('')
      sugg.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => go('#/graph/' + b.dataset.id)))
    })
  }

  /* ---------- 结构树 ---------- */

  function renderMap() {
    setTab('map')
    topSub.textContent = '全书结构 · 14 章 58 节'
    const blocks = D.chapters.map((c, i) => {
      const no = i + 1
      const subs = (c.sections || []).map((s, j) => {
        const kps = kpsOfSection(no, j)
        const leaves = kps.map(k => `<a class="leaf" href="#/kp/${k.id}">${esc(k.title)}<span>p${k.page_book}</span></a>`).join('')
        return `<details class="tree sub">
          <summary>${esc(s.title)}<span class="n">${kps.length} 点</span></summary>
          ${leaves}
        </details>`
      }).join('')
      return `<details class="tree">
        <summary>第 ${no} 章 ${esc(c.title)}<span class="n">${c.kp_count} 点</span></summary>
        ${subs}
      </details>`
    }).join('')
    view.innerHTML = `
      <div class="btn-row" style="margin:0 0 10px">
        <button class="btn" id="allOpen">全部展开</button>
        <button class="btn" id="allClose">全部收起</button>
      </div>
      ${blocks}`
    view.querySelector('#allOpen').addEventListener('click', () => view.querySelectorAll('details').forEach(d => { d.open = true }))
    view.querySelector('#allClose').addEventListener('click', () => view.querySelectorAll('details').forEach(d => { d.open = false }))
  }

  /* ---------- 原书页弹层 ---------- */

  function openPage(k) {
    const text = PAGES[String(k.page_pdf)] || ''
    sheetTitle.textContent = `第 ${k.page_book} 页（pdf ${k.page_pdf}）`
    sheetMeta.innerHTML = `${esc(k.title)}${PDF_URL ? ` · <a href="${PDF_URL}#page=${k.page_pdf}" target="_blank" rel="noopener">打开 PDF</a>` : ''}`
    if (text) {
      const r = L.highlightInPage(text, k.quote)
      sheetBody.innerHTML = r.html
    } else {
      sheetBody.innerHTML = '<p class="hint">这一页的文本没有打包进来。</p>'
    }
    sheet.hidden = false
    document.body.style.overflow = 'hidden'
  }

  function closeSheet() {
    sheet.hidden = true
    document.body.style.overflow = ''
  }

  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet() })

  window.addEventListener('hashchange', () => render())
  render()
})()
