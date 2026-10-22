// Desktop mode: turns the sections of index.html into windows.
// The website view (index.html) stays the single source of content.
(function () {
  'use strict';

  var ICONS = {
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M3 20h18M4 17c4-1 7-4 9-9 1-2 3-4 6-5"/><path d="M9 15l3-5 4 1-2 5z"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
  };

  // id, window title, icon label, icon, default size
  var APPS = [
    { id: 'about', title: 'About John', label: 'About John', icon: 'user', tone: 'oak', w: 500, h: 640 },
    { id: 'reincarnate', title: 'REINCARNATE · Horizon Europe', label: 'REINCARNATE', img: 'assets/logos/reincarnate.png', w: 1000, h: 760 },
    { id: 'ashvin', title: 'ASHVIN · Horizon 2020', label: 'ASHVIN', img: 'assets/logos/ashvin.png', w: 960, h: 720 },
    { id: 'bimspeed', title: 'BIM-SPEED · Gdynia study', label: 'BIM-SPEED', img: 'assets/logos/bimspeed.png', w: 960, h: 740 },
    { id: 'fig1', title: 'Fig1_psychrometric.chart', label: 'Fig1.chart', icon: 'chart', tone: 'glass', w: 680, h: 600 },
    { id: 'more', title: 'Further research', label: 'Further research', icon: 'folder', w: 900, h: 680 },
    { id: 'cv', title: 'CV · Experience & methods', label: 'CV', icon: 'doc', w: 860, h: 700 },
    { id: 'contact', title: 'Contact', label: 'Contact', icon: 'mail', tone: 'oak', w: 560, h: 420 }
  ];
  var APP = {};
  APPS.forEach(function (a) { APP[a.id] = a; });

  // links inside the page content that should open windows instead
  var LINK_TO_WIN = { '#research': 'reincarnate', '#contact': 'contact', '#more': 'more', '#experience': 'cv', '#methods': 'cv' };

  var body = document.body;
  var desk = document.getElementById('desk');
  var iconsEl = document.getElementById('icons');
  var tasksEl = document.getElementById('tasks');
  var startBtn = document.getElementById('start');
  var startMenu = document.getElementById('startmenu');
  var smList = document.getElementById('sm-list');
  var dock = document.getElementById('dock');

  var content = {};     // id -> DocumentFragment builder
  var wins = {};        // id -> { el, task, app }
  var order = [];       // stacking order, last is on top
  var z = 10;
  var mode = '';

  function iconHTML(app, cls) {
    if (app.img) return '<span class="' + cls + '"><img src="' + app.img + '" alt=""></span>';
    return '<span class="' + cls + (app.tone ? ' ' + app.tone : '') + '">' + ICONS[app.icon] + '</span>';
  }
  function smallIcon(app) {
    return app.img ? '<img src="' + app.img + '" alt="">' : ICONS[app.icon];
  }

  function setMode() {
    var w = window.innerWidth;
    var next = w <= 700 ? 'mobile' : (w <= 1024 ? 'tablet' : 'desktop');
    if (next === mode) return;
    mode = next;
    body.classList.remove('mode-mobile', 'mode-tablet', 'mode-desktop');
    body.classList.add('mode-' + mode);
  }

  /* ---------- content from index.html ---------- */
  function stripIds(node) {
    if (node.removeAttribute && node.tagName !== 'title' && node.tagName !== 'desc') node.removeAttribute('id');
    node.querySelectorAll && node.querySelectorAll('[id]').forEach(function (n) {
      if (n.closest('svg')) return;
      n.removeAttribute('id');
    });
    return node;
  }
  function frag() {
    var f = document.createDocumentFragment();
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) f.appendChild(arguments[i]);
    return f;
  }
  function heading(text) { var h = document.createElement('h2'); h.className = 'win-h'; h.textContent = text; return h; }
  function wrapDiv(cls, nodes) { var d = document.createElement('div'); d.className = cls; nodes.forEach(function (n) { if (n) d.appendChild(n); }); return d; }

  function buildContent(doc) {
    var q = function (sel) { var n = doc.querySelector(sel); return n ? stripIds(n.cloneNode(true)) : null; };
    var papers = doc.querySelectorAll('#research article.paper');
    var paper = function (i) { return papers[i] ? stripIds(papers[i].cloneNode(true)) : null; };
    content.about = function () { return frag(q('.hero-text'), q('.evidence')); };
    content.reincarnate = function () { return frag(paper(0)); };
    content.ashvin = function () { return frag(paper(1)); };
    content.bimspeed = function () { return frag(paper(2)); };
    content.fig1 = function () { return frag(q('.hero-card')); };
    content.more = function () { return frag(heading('Further research & tools'), q('#more .minor')); };
    content.cv = function () {
      return frag(
        wrapDiv('cv-block', [heading('Experience'), q('#experience .cv')]),
        wrapDiv('cv-block', [heading('Methods & tools'), q('#methods .methods'), q('#methods .creds')])
      );
    };
    content.contact = function () { var c = q('#contact .wrap'); if (c) c.classList.add('contact'); return frag(c); };
  }

  /* ---------- desktop icons, start menu ---------- */
  function renderIcons() {
    APPS.forEach(function (app) {
      var b = document.createElement('button');
      b.className = 'icon';
      b.type = 'button';
      b.innerHTML = iconHTML(app, 'icon-img') + '<span>' + app.label + '</span>';
      b.addEventListener('click', function () { openWin(app.id); });
      iconsEl.appendChild(b);

      var li = document.createElement('li');
      var sb = document.createElement('button');
      sb.type = 'button';
      sb.innerHTML = smallIcon(app) + '<span>' + app.title + '</span>';
      sb.addEventListener('click', function () { toggleStart(false); openWin(app.id); });
      li.appendChild(sb);
      smList.appendChild(li);
    });
  }
  function toggleStart(show) {
    var open = typeof show === 'boolean' ? show : startMenu.hidden;
    startMenu.hidden = !open;
    startBtn.setAttribute('aria-expanded', String(open));
  }
  startBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleStart(); });
  document.addEventListener('click', function (e) {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startBtn) toggleStart(false);
  });

  /* ---------- windows ---------- */
  function deskRect() { return desk.getBoundingClientRect(); }

  function place(w, app) {
    var r = deskRect();
    var n = Object.keys(wins).length;
    var ww = Math.min(app.w, r.width - 140);
    var hh = Math.min(app.h, r.height - 32);
    var x = Math.min(130 + (n % 6) * 34, Math.max(0, r.width - ww - 8));
    var y = Math.min(16 + (n % 6) * 30, Math.max(0, r.height - hh - 8));
    w.style.width = ww + 'px';
    w.style.height = hh + 'px';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
  }

  function makeWin(id) {
    var app = APP[id];
    var el = document.createElement('section');
    el.className = 'win opening';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', app.title);
    el.dataset.id = id;
    el.innerHTML =
      '<header class="win-bar"><span class="win-icon">' + smallIcon(app) + '</span>' +
      '<h2 class="win-title">' + app.title + '</h2>' +
      '<div class="win-ctrl">' +
      '<button type="button" data-act="min" aria-label="Minimise">&#8211;</button>' +
      '<button type="button" data-act="max" aria-label="Maximise">&#9633;</button>' +
      '<button type="button" data-act="close" aria-label="Close">' + (mode === 'mobile' ? 'Done' : '&#10005;') + '</button>' +
      '</div></header><div class="win-body"></div><span class="resize" aria-hidden="true"></span>';
    var bodyEl = el.querySelector('.win-body');
    if (content[id]) bodyEl.appendChild(content[id]());
    desk.appendChild(el);
    place(el, app);
    el.addEventListener('animationend', function () { el.classList.remove('opening'); }, { once: true });

    el.addEventListener('pointerdown', function () { focusWin(id); });
    el.querySelector('.win-ctrl').addEventListener('click', function (e) {
      var act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (act === 'min') minimise(id);
      if (act === 'max') toggleMax(id);
      if (act === 'close') closeWin(id);
    });
    el.querySelector('.win-bar').addEventListener('dblclick', function (e) {
      if (!e.target.closest('.win-ctrl') && mode === 'desktop') toggleMax(id);
    });
    bodyEl.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var target = LINK_TO_WIN[a.getAttribute('href')];
      if (target) { e.preventDefault(); openWin(target); }
    });
    enableDrag(el, id);
    enableResize(el);

    var task = document.createElement('button');
    task.type = 'button';
    task.className = 'task';
    task.innerHTML = smallIcon(app) + '<span>' + app.label + '</span>';
    task.addEventListener('click', function () {
      var w = wins[id];
      if (w.el.hidden) { w.el.hidden = false; focusWin(id); }
      else if (order[order.length - 1] === id) minimise(id);
      else focusWin(id);
    });
    tasksEl.appendChild(task);

    wins[id] = { el: el, task: task, app: app };
    return wins[id];
  }

  function focusWin(id) {
    var w = wins[id];
    if (!w) return;
    order = order.filter(function (x) { return x !== id; });
    order.push(id);
    w.el.style.zIndex = ++z;
    Object.keys(wins).forEach(function (k) {
      var on = k === id && !wins[k].el.hidden;
      wins[k].el.classList.toggle('inactive', !on);
      wins[k].task.classList.toggle('active', on);
      wins[k].task.classList.toggle('min', wins[k].el.hidden);
    });
    syncHash(id);
    syncDock();
  }

  function openWin(id, opts) {
    if (id === 'home') { closeAll(); return; }
    if (!APP[id]) return;
    toggleStart(false);
    var w = wins[id] || makeWin(id);
    w.el.hidden = false;
    if (opts && opts.max && mode === 'desktop') w.el.classList.add('max');
    focusWin(id);
    if (mode === 'mobile' && !(opts && opts.fromHistory)) history.pushState({ win: id }, '', '#' + id);
    var focusTarget = w.el.querySelector('.win-ctrl [data-act="close"]');
    if (focusTarget && !(opts && opts.quiet)) focusTarget.focus({ preventScroll: true });
  }

  function topVisible() {
    for (var i = order.length - 1; i >= 0; i--) if (wins[order[i]] && !wins[order[i]].el.hidden) return order[i];
    return null;
  }

  function minimise(id) {
    var w = wins[id];
    w.el.hidden = true;
    w.task.classList.add('min');
    w.task.classList.remove('active');
    var next = topVisible();
    if (next) focusWin(next); else syncHash(null);
  }

  function toggleMax(id) { wins[id].el.classList.toggle('max'); }

  function closeWin(id, fromHistory) {
    var w = wins[id];
    if (!w) return;
    w.el.remove();
    w.task.remove();
    delete wins[id];
    order = order.filter(function (x) { return x !== id; });
    var next = topVisible();
    if (next) focusWin(next); else { syncHash(null); syncDock(); }
    if (mode === 'mobile' && !fromHistory && history.state && history.state.win === id) history.back();
  }

  function closeAll() { Object.keys(wins).forEach(function (k) { closeWin(k, true); }); syncHash(null); syncDock(); }

  function syncHash(id) {
    if (mode === 'mobile') return; // phone uses pushState so Back closes the sheet
    var h = id ? '#' + id : ' ';
    try { history.replaceState(null, '', id ? h : location.pathname); } catch (e) { /* ignore */ }
  }

  function syncDock() {
    var top = topVisible();
    dock.querySelectorAll('button').forEach(function (b) {
      var k = b.dataset.open;
      var on = (k === 'home' && !top) || (k === 'reincarnate' && (top === 'reincarnate' || top === 'ashvin' || top === 'bimspeed')) || k === top;
      b.classList.toggle('on', on);
    });
  }

  /* ---------- drag, snap, resize (desktop only) ---------- */
  var hint = null;
  function showHint(rect) {
    if (!rect) { if (hint) { hint.remove(); hint = null; } return; }
    if (!hint) { hint = document.createElement('div'); hint.className = 'snap-hint'; document.body.appendChild(hint); }
    hint.style.left = rect.x + 'px'; hint.style.top = rect.y + 'px';
    hint.style.width = rect.w + 'px'; hint.style.height = rect.h + 'px';
  }
  function snapRect(px, py) {
    var r = deskRect();
    if (px <= 6) return { x: 0, y: 0, w: r.width / 2, h: r.height };
    if (px >= window.innerWidth - 6) return { x: r.width / 2, y: 0, w: r.width / 2, h: r.height };
    if (py <= 4) return { x: 0, y: 0, w: r.width, h: r.height, max: true };
    return null;
  }

  function enableDrag(el, id) {
    var bar = el.querySelector('.win-bar');
    var sx, sy, ox, oy, dragging = false, snap = null;
    bar.addEventListener('pointerdown', function (e) {
      if (mode !== 'desktop' || e.button !== 0 || e.target.closest('.win-ctrl')) return;
      if (el.classList.contains('max')) {
        // pull a maximised window back to its normal size under the pointer
        el.classList.remove('max');
        var wpx = parseFloat(el.style.width);
        el.style.left = Math.max(0, e.clientX - wpx / 2) + 'px';
        el.style.top = '0px';
      }
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.left) || 0; oy = parseFloat(el.style.top) || 0;
      el.classList.add('dragging');
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var r = deskRect();
      var nx = Math.min(Math.max(ox + e.clientX - sx, -el.offsetWidth + 120), r.width - 120);
      var ny = Math.min(Math.max(oy + e.clientY - sy, 0), r.height - 40);
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
      snap = snapRect(e.clientX, e.clientY);
      showHint(snap);
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      if (snap) {
        if (snap.max) el.classList.add('max');
        else { el.style.left = snap.x + 'px'; el.style.top = snap.y + 'px'; el.style.width = snap.w + 'px'; el.style.height = snap.h + 'px'; }
      }
      snap = null;
      showHint(null);
    }
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  function enableResize(el) {
    var handle = el.querySelector('.resize');
    var sx, sy, sw, sh, on = false;
    handle.addEventListener('pointerdown', function (e) {
      if (mode !== 'desktop') return;
      on = true; sx = e.clientX; sy = e.clientY; sw = el.offsetWidth; sh = el.offsetHeight;
      handle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!on) return;
      el.style.width = Math.max(320, sw + e.clientX - sx) + 'px';
      el.style.height = Math.max(180, sh + e.clientY - sy) + 'px';
    });
    handle.addEventListener('pointerup', function () { on = false; });
  }

  /* ---------- keyboard, history, resize ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!startMenu.hidden) { toggleStart(false); startBtn.focus(); return; }
    var top = topVisible();
    if (top) closeWin(top);
  });

  window.addEventListener('popstate', function () {
    if (mode !== 'mobile') return;
    var id = location.hash.slice(1);
    Object.keys(wins).forEach(function (k) { if (k !== id) closeWin(k, true); });
    if (APP[id] && !wins[id]) openWin(id, { fromHistory: true });
  });

  dock.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open === 'home') {
      closeAll();
      if (history.state && history.state.win) history.pushState(null, '', location.pathname);
    } else openWin(b.dataset.open);
  });

  window.addEventListener('resize', function () {
    var before = mode;
    setMode();
    if (before !== mode) {
      Object.keys(wins).forEach(function (k) {
        var btn = wins[k].el.querySelector('[data-act="close"]');
        btn.innerHTML = mode === 'mobile' ? 'Done' : '&#10005;';
      });
    }
  });

  /* ---------- start ---------- */
  function start() {
    var id = location.hash.slice(1);
    if (APP[id]) {
      if (mode === 'mobile') history.replaceState({ win: id }, '', '#' + id);
      openWin(id, { fromHistory: true, quiet: true });
      return;
    }
    if (mode === 'desktop') {
      openWin('about', { quiet: true });
      var a = wins.about.el;
      a.style.left = '130px'; a.style.top = '16px';
      openWin('reincarnate', { quiet: true });
      var r = deskRect();
      var re = wins.reincarnate.el;
      var rw = Math.min(980, r.width - 420);
      if (rw >= 640) {
        re.style.width = rw + 'px';
        re.style.left = (r.width - rw - 24) + 'px';
        re.style.top = '40px';
      }
    } else if (mode === 'tablet') {
      openWin('reincarnate', { quiet: true });
    }
    syncDock();
  }

  setMode();
  renderIcons();
  fetch('index.html')
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
    .then(function (html) {
      buildContent(new DOMParser().parseFromString(html, 'text/html'));
      start();
    })
    .catch(function () {
      desk.insertAdjacentHTML('beforeend', '<p class="nojs">The content could not load. <a href="index.html">Open the website view</a>.</p>');
    });
})();
