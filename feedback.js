/* 匿名反馈模块 —— 独立于主站逻辑，可整体删除 */
(function () {
  'use strict'

  /* ====== 配置 ====== */
  // 留空 = 无后端模式：提交后让用户复制反馈内容发给你（零成本，立刻可试用）
  // 填上接口地址 = 直接 POST，例如 Cloudflare Worker：
  //   https://psy-feedback.你的账号.workers.dev
  var ENDPOINT = ''

  var STORE_KEY = 'psy.fb.sent'

  /* ====== 状态 ====== */
  var rating = 0
  var role = ''
  var busy = false

  /* ====== DOM ====== */
  var fab = document.createElement('button')
  fab.className = 'fb-fab'
  fab.type = 'button'
  fab.setAttribute('aria-label', '匿名反馈')
  fab.title = '匿名反馈'
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/></svg>'

  var mask = null

  function close() {
    if (!mask) return
    mask.remove()
    mask = null
    document.body.style.overflow = ''
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (html != null) n.innerHTML = html
    return n
  }

  function open() {
    if (mask) return
    rating = 0
    role = ''

    mask = el('div', 'fb-mask')
    var panel = el('div', 'fb-panel')

    panel.innerHTML =
      '<div class="fb-head">' +
        '<h2 class="fb-title">匿名反馈</h2>' +
        '<button class="fb-x" type="button" aria-label="关闭">×</button>' +
      '</div>' +
      '<p class="fb-note">' +
        '这份资料库还在试用阶段，哪里不好用、哪里看不懂，都请直说。<br>' +
        '<b>不需要登录，不收集姓名</b>，只记录你填的内容和当前页面。' +
      '</p>' +

      '<label class="fb-label">整体感觉</label>' +
      '<div class="fb-stars">' +
        ['1 很难用', '2', '3 一般', '4', '5 很好用'].map(function (t, i) {
          return '<button class="fb-star" type="button" data-v="' + (i + 1) + '">' + t + '</button>'
        }).join('') +
      '</div>' +

      '<label class="fb-label">具体说说（选填但很有用）</label>' +
      '<textarea class="fb-ta" maxlength="600" placeholder="比如：搜「组块」搜不到；知识点卡片太长；想看思维导图……"></textarea>' +

      '<label class="fb-label">你是</label>' +
      '<div class="fb-chips">' +
        ['学生', '老师', '备考', '随便看看'].map(function (t) {
          return '<button class="fb-chip" type="button" data-r="' + t + '">' + t + '</button>'
        }).join('') +
      '</div>' +

      '<button class="fb-submit" type="button">提交反馈</button>' +
      '<div class="fb-err" hidden></div>'

    mask.appendChild(panel)
    document.body.appendChild(mask)
    document.body.style.overflow = 'hidden'

    // 关闭
    panel.querySelector('.fb-x').onclick = close
    mask.addEventListener('click', function (e) { if (e.target === mask) close() })

    // 评分
    panel.querySelectorAll('.fb-star').forEach(function (b) {
      b.onclick = function () {
        rating = +b.dataset.v
        panel.querySelectorAll('.fb-star').forEach(function (x) {
          x.classList.toggle('on', +x.dataset.v <= rating)
        })
      }
    })

    // 身份
    panel.querySelectorAll('.fb-chip').forEach(function (b) {
      b.onclick = function () {
        role = role === b.dataset.r ? '' : b.dataset.r
        panel.querySelectorAll('.fb-chip').forEach(function (x) {
          x.classList.toggle('on', x.dataset.r === role)
        })
      }
    })

    panel.querySelector('.fb-submit').onclick = function () { submit(panel, this) }
  }

  function collect(ta) {
    return {
      rating: rating,
      text: (ta.value || '').trim().slice(0, 600),
      role: role,
      page: location.hash || '#/chapters',
      ua: navigator.userAgent.slice(0, 120),
      vw: window.innerWidth,
      at: new Date().toISOString()
    }
  }

  function submit(panel, btn) {
    var ta = panel.querySelector('.fb-ta')
    var err = panel.querySelector('.fb-err')
    var data = collect(ta)

    if (!rating) {
      err.textContent = '先点一下整体感觉（1–5）'
      err.hidden = false
      return
    }
    err.hidden = true

    // 无后端：显示可复制文本
    if (!ENDPOINT) {
      showDone(panel, data)
      return
    }

    if (busy) return
    busy = true
    btn.disabled = true
    btn.textContent = '提交中…'

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      try { localStorage.setItem(STORE_KEY, data.at) } catch (e) {}
      showDone(panel, null)
    }).catch(function (e) {
      err.textContent = '提交失败（' + e.message + '），可以点下面的按钮复制反馈'
      err.hidden = false
      showDone(panel, data, true)
    }).then(function () {
      busy = false
      btn.disabled = false
      btn.textContent = '提交反馈'
    })
  }

  function showDone(panel, data, keepMask) {
    var text = data
      ? '【普通心理学资料库 · 反馈】\n' +
        '评分：' + data.rating + '/5\n' +
        '身份：' + (data.role || '未填') + '\n' +
        '页面：' + data.page + '\n' +
        '内容：' + (data.text || '（未填文字）') + '\n' +
        '时间：' + data.at
      : ''

    panel.innerHTML =
      '<div class="fb-ok">' +
        '<div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg></div>' +
        '<h3>' + (data ? '收到，谢谢' : '已提交，谢谢') + '</h3>' +
        '<p>' + (data
          ? '当前是无后端模式。点下面复制，把这段发给我就行。'
          : '你的反馈已经记下了，不用再做什么。') + '</p>' +
        (data ? '<button class="fb-copy" type="button">复制反馈内容</button>' : '') +
        '<button class="fb-again" type="button">关闭</button>' +
      '</div>'

    var copyBtn = panel.querySelector('.fb-copy')
    if (copyBtn) {
      copyBtn.onclick = function () {
        var done = function () {
          copyBtn.textContent = '✓ 已复制'
          copyBtn.style.background = '#e8f4f2'
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback)
        } else fallback()

        function fallback() {
          var ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          try { document.execCommand('copy'); done() } catch (e) { copyBtn.textContent = '请长按选择复制' }
          ta.remove()
        }
      }
    }
    panel.querySelector('.fb-again').onclick = close
  }

  /* ====== 初始化 ====== */
  function init() {
    document.body.appendChild(fab)
    fab.onclick = open
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close()
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
