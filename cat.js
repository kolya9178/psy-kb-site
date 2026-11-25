/* ============================================================
   问猫 —— 本地伪 AI
   规则匹配 + 数据检索 + 科利亚猫口吻，不调用任何模型接口。
   匹配不到就直说，不编。
   ============================================================ */
(function (global) {
  'use strict'

  const D = global.__PSY__ || { kps: [], chapters: [], confusable: [] }
  const L = global.PsyLib
  const PAGES = global.__PAGES__ || {}

  const byId = new Map(D.kps.map(k => [k.id, k]))
  const pairOf = new Map()
  D.confusable.forEach(p => { pairOf.set(p.a + '|' + p.b, p); pairOf.set(p.b + '|' + p.a, p) })

  /* ---------- 语料 ---------- */

  const KAO = '≽^• ˕ • ྀི≼'
  const KAO2 = 'ฅ^•ﻌ•^ฅ'

  const GREET = [
    '唔——在呢。想问什么？ ' + KAO,
    '呼噜呼噜…猫在。翻书找我吧。 ' + KAO2,
    '嗯？来问吧，猫听着。',
    '在的。今天想翻哪一章？ ' + KAO,
  ]

  const HELP = `猫会这几件事：

· 问概念 —— 「什么是知觉的恒常性」
· 比一比 —— 「感觉和知觉有什么区别」
· 找出处 —— 「工作记忆在第几页」
· 按页查 —— 「129 页讲了什么」
· 随便翻 —— 「来一条」

猫只答这本书里的东西。书里没写的，猫会直说。 ${KAO}`

  const NO_IDEA = [
    '本猫还不会喵……\n\n「%s」这个，等喵学会了再来呀喵',
    '本猫还不会喵……\n\n「%s」猫翻不到，等喵学会了再来呀喵',
    '本猫还不会喵……\n\n「%s」还没学会，等喵学会了再来呀喵',
  ]

  /* 自我介绍：问「你是谁」时用，和能力说明分开 */
  /* ---------- 人设回答 ---------- */

  const AGE = [
    '本喵才三个月大喵～\n\n从第一次被叫醒到现在，猫只学会了翻这一本书。',
    '唔…按猫的算法，应该是三个月。\n\n按人的算法，大概就是刚会看目录的年纪喵。',
  ]

  const OWNER = [
    '有呀，就是把这个站做出来的人。\n\n猫住在他手机里，只认他一个。\n你来找猫问知识点，猫也照样答喵。',
    '有主人的喵。\n\n他把 588 页的书一页页喂给猫，才有了现在这些。\n你要是背不下来，怪猫就好，别怪他。',
  ]

  const PRAISE = [
    '唔——愿意翻书的人，本身就很难得喵。\n\n你已经比昨天多懂一点了，猫记着呢。',
    '夸你：明明可以去刷手机，却跑来背知识点。\n这份自觉，值得一个 ✧₍^˶- ˕ -˵^₎✧',
    '今天的你，比昨天多认识了一个概念。\n这很厉害，别小看它喵。',
  ]

  const TIRED = [
    '累了就歇会儿，猫又不催你。\n\n知识点不会跑，明天再翻也一样。',
    '呼噜呼噜…先靠一下。\n\n书里写着：短时记忆只装得下 7±2 个组块。\n一次背不住那么多，不是你笨，是脑子本来就长这样喵。',
    '别硬扛。\n\n猫在这儿不走，你什么时候回来都行。',
  ]

  const REMEMBER = [
    '记不住不怪你喵。\n\n书里讲，短时记忆只装得下 7±2 个组块，不复述的话 15–30 秒就散了。\n要留住它，得让它进长时记忆：反复复述、跟已经懂的东西挂钩、别一次塞太多。\n\n想细看，问猫「遗忘」「复述」「加工水平说」。',
    '唔——这个猫有办法喵。\n\n先别硬背。书里说记忆有三步：编码、存储、提取。背不进去，多半是编码那一步没做深：光念不动脑，字是滑过去的。\n\n试试给它找个例子，或者跟自己熟悉的事挂钩，编码深了才留得住。',
  ]

  const REPLACE = [
    '本喵？不行的喵。\n\n猫只会把书上的字翻给你看，翻得准，但看不出你哪句话没听懂。\n真老师问一句「哪不懂」，比猫翻十页都管用。',
    '取代不了。\n\n猫记性好，但不会看你皱眉头。\n你对着猫发愁的时候，猫只能干看着——这一点就输给老师了喵。',
  ]

  const IDENTITY =
    '本喵是住在你手机里的一只虚拟小猫呀，是你见过最聪明的喵了呀喵～✧₍^˶- ˕ -˵^₎✧' +
    '\n\n不过本事有限：只会翻这本《普通心理学》，593 个知识点、452 对易混都记着。' +
    '\n想问哪一条，直接报名字就好。'

  const OUT_OF_BOOK = [
    '这个第六版里确实没写。',
    '书里没有这一块，猫不编。',
    '翻过了，这版书没讲。',
  ]

  /* 任务书里点名、但原文核实确实没有的内容（来自 GAPS.md） */
  const GAPS = [
    '瑞文', '信度', '效度', '习得性无助', '合作学习', '罗特', '控制点',
    '埃里克森八阶段', '格塞尔', '视崖', '去习惯化', '随意后注意', '注意广度',
    '花园路径', 'mcgurk', '面部反馈', '语言获得理论',
  ]

  /* ---------- 工具 ---------- */

  const rand = a => a[Math.floor(Math.random() * a.length)]
  const pick = (a, n) => a.slice(0, n)
  const esc = s => L.escapeHtml(s)

  function clean(q) {
    return String(q || '').trim().replace(/[？?！!。，,、~～\s]+$/g, '')
  }

  /* 从问句里挖出可能的术语 */
  function extractTerms(q) {
    let s = clean(q)
    const pats = [
      /^(?:请)?(?:问一下|问你|告诉我|帮猫|帮我)?(?:什么是|啥是|什么叫|啥叫|何为)\s*(.+)$/,
      /^(.+?)(?:是什么|是啥|是什么意思|的定义|定义|指什么|是哪个)$/,
      /^(?:讲讲|说说|解释一下|解释|介绍一下|介绍|聊一下|聊聊)\s*(.+)$/,
      /^(.+?)(?:在哪一章|在第几章|在哪一节|在哪|哪里|第几页|多少页)[？?]?$/,
      /^(?:怎么|如何|怎样|咋)(?:理解|看|区分|分辨|记|背|学|用)\s*(.+)$/,
    ]
    for (const p of pats) {
      const m = s.match(p)
      if (m && m[1]) return m[1].trim()
    }
    return s
  }

  /* 归一化：去虚词 */
  function strip(q) {
    return q.replace(/的|了|吗|呢|啊|呀|吧|请问|一下|这个|那个|概念|定义/g, '').trim()
  }

  /* 常用词：拆词兜底时跳过，否则「所以」「问题」会撞上任意一条定义 */
  const STOP = new Set([
    '所以', '因此', '这个', '那个', '什么', '怎么', '怎样', '可以', '能不', '不能',
    '问题', '回答', '答案', '课本', '教材', '书本', '我们', '你们', '它们', '他们',
    '就是', '不是', '有没', '没有', '一个', '这样', '那样', '知道', '觉得', '应该',
    '为什', '么样', '怎样', '如何', '是否', '是不', '不是', '只回', '答课', '本问',
    '你的', '我的', '它的', '是不', '么是', '么叫', '一下', '帮我', '告诉',
  ])

  function findKps(q, limit) {
    const t = strip(extractTerms(q))
    if (!t) return []
    /* 整句检索：只要分数够低就不认（定义里蹭到一两个字的算噪声） */
    let hits = L.search(D.kps, t).filter(h => h.score >= 28)
    if (!hits.length && t.length >= 2) {
      /* 退一步：按 2-gram 拆开搜，跳过常用词，只认标题/别名/关键词级（≥60）。
         关键：全部片段都搜一遍再累计，被多个片段命中的更相关，
         避免「第一个撞上的赢」（问「知觉的恒常性」就不会只答「知觉」）。 */
      const acc = new Map()
      for (let i = 0; i + 2 <= t.length; i++) {
        const g = t.slice(i, i + 2)
        if (STOP.has(g)) continue
        for (const h of L.search(D.kps, g)) {
          if (h.score < 60) continue
          const prev = acc.get(h.kp.id)
          if (prev) { prev.n += 1; prev.best = Math.max(prev.best, h.score) }
          else acc.set(h.kp.id, { kp: h.kp, n: 1, best: h.score })
        }
      }
      hits = [...acc.values()]
        .sort((a, b) => (b.n * 80 + b.best) - (a.n * 80 + a.best))
        .map(x => ({ kp: x.kp, score: x.n * 80 + x.best }))
    }
    return pick(hits, limit || 3)
  }

  function kpLine(k) {
    const c = D.chapters[k.chapter - 1] || {}
    return `${k.title}　第 ${k.chapter} 章 · 书 ${k.page_book} 页`
  }

  function describe(k) {
    const pts = (k.points || []).slice(0, 3)
      .map((p, i) => `${i + 1}. ${p}`).join('\n')
    const c = D.chapters[k.chapter - 1] || {}
    let out = `「${k.title}」\n\n${k.definition}\n`
    if (pts) out += `\n${pts}\n`
    if ((k.confusable || []).length) {
      const names = k.confusable.map(id => (byId.get(id) || {}).title).filter(Boolean)
      if (names.length) out += `\n容易混：${names.join('、')}`
    }
    out += `\n\n第 ${k.chapter} 章 ${c.title || ''} · 书 ${k.page_book} 页（pdf ${k.page_pdf}）`
    return { text: out, kp: k }
  }

  function describePair(a, b) {
    const p = pairOf.get(a.id + '|' + b.id) || {}
    let out = `这两个确实容易混——\n\n`
    out += `【${a.title}】${a.definition}\n\n`
    out += `【${b.title}】${b.definition}\n`
    if (p.distinction) out += `\n猫的记法：${p.distinction}`
    const pg = `${a.title} 见书 ${a.page_book} 页，${b.title} 见书 ${b.page_book} 页。`
    out += `\n\n${pg}`
    return { text: out, pair: [a, b] }
  }

  function pageAnswer(n) {
    const text = PAGES[String(n)]
    if (!text) return null
    const onPage = D.kps.filter(k => k.page_pdf === n || k.page_book === n)
    let out = `第 ${n} 页`
    if (onPage.length) {
      out += `，这页上有这些知识点：\n\n`
      out += onPage.map(k => `· ${k.title}　第 ${k.chapter} 章`).join('\n')
    } else {
      out += `，猫没在这一页找到标注过的知识点。原文开头是这样的：\n\n`
      out += text.replace(/\s+/g, '').slice(0, 120) + '…'
    }
    return { text: out, page: n }
  }

  /* ---------- 意图 ---------- */

  function detect(q) {
    const s = clean(q)
    const low = s.toLowerCase()
    if (!s) return { type: 'empty' }

    if (/^(你好|您好|嗨|hi|hello|在吗|在不在|猫|猫猫|科利亚)/i.test(s)) return { type: 'greet' }
    if (/(你能做什么|你会什么|帮助|怎么用|help|说明)/i.test(s)) return { type: 'help' }

    /* 问身份 */
    if (/你是谁|你叫什么|你是什么|自我介绍|你哪位/.test(s)) return { type: 'identity' }

    if (/你(几|多大|多少)岁|几岁|多大了|年龄/.test(s)) return { type: 'age' }
    if (/(你|猫).{0,3}主人|谁养|谁把你|你有家/.test(s)) return { type: 'owner' }
    if (/(夸夸我|夸我|表扬我|我棒|我做得好|厉害吗)/.test(s)) return { type: 'praise' }
    if (/(记不住|背不下来|背不进去|老是忘|学了就忘|看不进去)/.test(s)) return { type: 'remember' }
    if (/(我好累|累死|好累|撑不住|学不动|不想学|好难|太难了|不想看)/.test(s)) return { type: 'tired' }
    if (/(取代|代替|替代).{0,4}(老师|教师|人)|老师.{0,4}(没用|还要|会不会)/.test(s)) return { type: 'replace' }

    /* 问能力边界 */
    if (
      /(你|猫).{0,4}(只|仅).{0,4}(回答|答|讲|说)/.test(s) ||
      /只(回答|答).{0,6}(课本|教材|书)/.test(s) ||
      /^(你|猫)(能|会)(做什么|什么|干嘛)/.test(s)
    ) return { type: 'about' }
    if (/(随便|随机|来一条|来一个|逛逛|翻翻|看看别的)/.test(s)) return { type: 'random' }

    if (GAPS.some(g => low.includes(g))) return { type: 'gap', term: s }

    const pm = s.match(/第?\s*(\d{1,3})\s*页/)
    if (pm) return { type: 'page', n: Number(pm[1]) }

    const cmp = s.match(/^(.+?)\s*(?:和|与|跟|vs\.?|VS)\s*(.+?)\s*(?:有什么|有啥|的)?(?:区别|不同|差别|区分)?[？?]?$/)
    if (cmp && /区别|不同|差别|区分|一样/.test(s)) {
      return { type: 'compare', a: cmp[1].trim(), b: cmp[2].trim() }
    }

    return { type: 'concept', q: s }
  }

  function answer(q) {
    const it = detect(q)

    if (it.type === 'empty') return { text: '嗯？猫没听清，再说一遍？' }
    if (it.type === 'greet') return { text: rand(GREET) }
    if (it.type === 'help') return { text: HELP }

    if (it.type === 'identity') return { text: IDENTITY }
    if (it.type === 'age') return { text: rand(AGE) }
    if (it.type === 'owner') return { text: rand(OWNER) }
    if (it.type === 'praise') return { text: rand(PRAISE) }
    if (it.type === 'remember') return { text: rand(REMEMBER) }
    if (it.type === 'tired') return { text: rand(TIRED) }
    if (it.type === 'replace') return { text: rand(REPLACE) }

    if (it.type === 'about') {
      return {
        text: `对，猫只答这本《普通心理学》第六版里的东西。\n\n` +
          `能查的：593 个知识点、452 对易混、14 章目录、588 页原文。\n` +
          `书里没写的（瑞文测验、信度效度、习得性无助这些），猫会直接说没有，不编。\n\n` +
          `想问具体的，直接说术语，比如「工作记忆」「知觉有什么特性」。 ${KAO}`,
      }
    }

    if (it.type === 'random') {
      const k = D.kps[Math.floor(Math.random() * D.kps.length)]
      const d = describe(k)
      return { text: `随手翻到一条—— ${KAO}\n\n${d.text}`, kp: k }
    }

    if (it.type === 'gap') {
      return {
        text: `${rand(OUT_OF_BOOK)}\n\n「${it.term}」这个考点，彭聃龄第六版里查不到。\n猫不编内容，所以这里只能告诉你：书里没有。\n要是考试要考，得对别的材料。`,
      }
    }

    if (it.type === 'page') {
      const a = pageAnswer(it.n)
      if (a) return a
      return { text: `这本书一共 588 页（pdf）。第 ${it.n} 页猫这里没有存原文。` }
    }

    if (it.type === 'compare') {
      const A = findKps(it.a, 1), B = findKps(it.b, 1)
      if (A.length && B.length && A[0].kp.id !== B[0].kp.id) {
        return describePair(A[0].kp, B[0].kp)
      }
      const one = A.length ? A[0].kp : (B.length ? B[0].kp : null)
      if (one) {
        const d = describe(one)
        return { text: `猫只认得其中一个——\n\n${d.text}`, kp: one }
      }
      return { text: `「${it.a}」和「${it.b}」猫都没找到。换个说法试试？` }
    }

    /* concept：先找知识点，再找易混对 */
    const hits = findKps(q, 3)
    if (hits.length) {
      const d = describe(hits[0].kp)
      let text = d.text
      if (hits.length > 1) {
        text += `\n\n还有这几条也沾边：` +
          hits.slice(1).map(h => `\n· ${kpLine(h.kp)}`).join('')
      }
      return { text, kp: hits[0].kp }
    }

    const term = extractTerms(q)
    return {
      text: rand(NO_IDEA).replace('%s', term) +
        `\n\n试试点下面的词，或者换成更短的术语。`,
    }
  }

  /* ---------- 交互层 ---------- */

  const STORE = 'psy.cat.log'

  function loadLog() {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]').slice(-40) } catch (e) { return [] }
  }
  function saveLog(m) {
    try { localStorage.setItem(STORE, JSON.stringify(m.slice(-40))) } catch (e) {}
  }

  let messages = []
  let busy = false

  function bubble(role, text, extra) {
    const wrap = document.createElement('div')
    wrap.className = 'msg ' + role
    if (role === 'cat') {
      wrap.innerHTML =
        '<div class="av"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 9.5 5.2 4l4 2.6a8 8 0 0 1 5.6 0L18.8 4 20 9.5a7 7 0 1 1-16 0Z"/>' +
        '<path d="M9.5 13h.01M14.5 13h.01"/></svg></div>' +
        `<div class="bd">${extra || esc(text).replace(/\n/g, '<br>')}</div>`
      wrap.querySelector('.bd').dataset.raw = text
    } else {
      wrap.innerHTML = `<div class="bd">${esc(text).replace(/\n/g, '<br>')}</div>`
    }
    return wrap
  }

  let viewEl = null
  let listEl = null

  function scrollEnd() {
    if (listEl) listEl.scrollTop = listEl.scrollHeight
  }

  function pushMsg(role, text, extra) {
    messages.push({ role, text })
    saveLog(messages)
    const node = bubble(role, text, extra)
    listEl.appendChild(node)
    scrollEnd()
    return node
  }

  /* 打字机：逐字显示，长文本按比例加快 */
  function typewrite(node, text, done) {
    const bd = node.querySelector('.bd')
    const total = text.length
    const step = total > 260 ? 2 : 1
    const speed = total > 260 ? 8 : 16
    let i = 0
    bd.innerHTML = ''
    const timer = setInterval(() => {
      i += step
      bd.innerHTML = esc(text.slice(0, i)).replace(/\n/g, '<br>')
      scrollEnd()
      if (i >= total) {
        clearInterval(timer)
        bd.innerHTML = esc(text).replace(/\n/g, '<br>')
        scrollEnd()
        if (done) done()
      }
    }, speed)
  }

  function thinking() {
    const n = document.createElement('div')
    n.className = 'msg cat typing'
    n.innerHTML =
      '<div class="av"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 9.5 5.2 4l4 2.6a8 8 0 0 1 5.6 0L18.8 4 20 9.5a7 7 0 1 1-16 0Z"/>' +
      '<path d="M9.5 13h.01M14.5 13h.01"/></svg></div>' +
      '<div class="bd"><span class="dots"><i></i><i></i><i></i></span></div>'
    listEl.appendChild(n)
    scrollEnd()
    return n
  }

  function ask(text, opts) {
    if (busy) return
    const q = String(text || '').trim()
    if (!q) return
    busy = true

    if (listEl) pushMsg('me', q)
    if (listEl) {
      const t = thinking()
      const wait = 320 + Math.random() * 380
      setTimeout(() => {
        t.remove()
        const a = answer(q)
        const node = pushMsg('cat', a.text)
        typewrite(node, a.text, () => {
          busy = false
          if (a.kp) addJump(node, a.kp)
        })
        if (opts && opts.onDone) opts.onDone(a)
      }, wait)
    } else {
      busy = false
    }
  }

  function addJump(node, kp) {
    const bd = node.querySelector('.bd')
    if (!bd || bd.querySelector('.go')) return
    const a = document.createElement('a')
    a.className = 'go'
    a.href = '#/kp/' + kp.id
    a.textContent = `看完整卡片 →`
    bd.appendChild(a)
    scrollEnd()
  }

  /* ---------- 键盘补偿 ----------
     Android Chrome 认 interactive-widget=resizes-content，视口自己会缩；
     不认的浏览器（部分 iOS/老内核）用 visualViewport 算键盘高度补进去。 */
  function syncKeyboard() {
    /* 直接按可视视口给 body 定高：
       键盘弹出 → vv.height 变小 → body 变矮，输入栏贴着键盘；
       键盘收起 → vv.height 恢复 → body 长回来。
       （不用 100dvh，部分安卓浏览器不会自动恢复） */
    if (!document.body.classList.contains('in-chat')) return
    const vv = global.visualViewport
    const h = vv ? vv.height : global.innerHeight
    if (h > 0) document.body.style.height = Math.round(h) + 'px'
    scrollEnd()
  }

  function bindViewport() {
    const vv = global.visualViewport
    if (!vv) return
    vv.addEventListener('resize', syncKeyboard)
    vv.addEventListener('scroll', syncKeyboard)
    syncKeyboard()
  }

  /* ---------- 视图 ---------- */

  const QUICK = ['什么是知觉的恒常性', '感觉和知觉有什么区别', '短时记忆在第几页', '129 页讲了什么', '来一条']

  function render(view) {
    viewEl = view
    messages = loadLog()

    view.innerHTML = `
      <div class="chat">
        <div class="chat-list" id="chatList"></div>
        <div class="chat-quick" id="chatQuick"></div>
        <form class="chat-bar" id="chatForm" autocomplete="off">
          <input id="chatInput" placeholder="问猫一个问题…" />
          <button type="submit" aria-label="发送">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-5.5 14-2.7-5.2L5 12Z"/></svg>
          </button>
        </form>
      </div>`

    listEl = view.querySelector('#chatList')

    if (!messages.length) {
      messages = [{ role: 'cat', text: '唔——猫在这儿。 ' + KAO + '\n\n这本书 593 个知识点，猫都翻过。\n想问什么直接说，或者点下面的词。' }]
    }
    messages.forEach(m => {
      const n = bubble(m.role, m.text)
      listEl.appendChild(n)
    })
    scrollEnd()

    const quick = view.querySelector('#chatQuick')
    quick.innerHTML = QUICK.map(q => `<button type="button" class="qchip">${esc(q)}</button>`).join('')
    quick.addEventListener('click', e => {
      const b = e.target.closest('.qchip')
      if (b) ask(b.textContent)
    })

    const form = view.querySelector('#chatForm')
    const input = view.querySelector('#chatInput')
    form.addEventListener('submit', e => {
      e.preventDefault()
      const v = input.value.trim()
      if (!v) return
      input.value = ''
      ask(v)
    })

    bindViewport()
    syncKeyboard()
    /* 不自动聚焦：进页就弹键盘会让布局先缩一次，用户点输入框时浏览器自己会处理 */
  }

  global.PsyCat = { render, ask, answer, detect }
})(typeof window !== 'undefined' ? window : globalThis)
