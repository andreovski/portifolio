// Comportamento da home: acentos por seção, retrato ASCII, despixelização, carimbos, manifesto, rastro do cursor e modo leve.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(pointer: fine)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var lite = false;
  try { lite = localStorage.getItem('lite') === '1'; } catch (e) {}
  function motionOn() { return !reduce.matches && !lite && !saveData; }
  function applyMotion() {
    root.classList.toggle('motion', motionOn());
    root.classList.toggle('lite', !motionOn());
    ['liteNav', 'liteFoot'].forEach(function (id) { document.getElementById(id).setAttribute('aria-pressed', String(lite)); });
    heroVideo();
  }
  /* hero video: plays only with motion on and while the hero is on screen */
  var heroVisible = true;
  function heroVideo() {
    var v = document.getElementById('heroVideo');
    if (!v) return;
    // iOS só deixa tocar sozinho se o vídeo estiver mudo também pela propriedade, não só pelo atributo
    v.muted = true; v.defaultMuted = true;
    if (motionOn() && heroVisible) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { videoBlocked = true; }); }
    else v.pause();
  }
  // Modo de economia de energia do iPhone bloqueia autoplay: tenta de novo no primeiro toque ou rolagem
  var videoBlocked = false;
  ['touchstart', 'pointerdown', 'scroll'].forEach(function (ev) {
    addEventListener(ev, function retry() { if (videoBlocked) { videoBlocked = false; heroVideo(); } }, { passive: true });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; heroVideo(); }).observe(document.getElementById('inicio'));
  }
  applyMotion();
  ['liteNav', 'liteFoot'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function () {
      lite = !lite;
      try { localStorage.setItem('lite', lite ? '1' : '0'); } catch (e) {}
      applyMotion(); startAscii(); setupTrail(); manifestoSetup();
    });
  });

  /* clock */
  var clock = document.getElementById('clock');
  function tick() {
    try { clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()); } catch (e) {}
  }
  tick(); setInterval(tick, 20000);

  /* menu */
  var nav = document.getElementById('nav'), menuBtn = document.getElementById('menuBtn');
  function setMenu(open) {
    nav.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav.querySelector('a').focus(); else menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  document.getElementById('closeBtn').addEventListener('click', function () { setMenu(false); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) { nav.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !nav.hidden) setMenu(false); });

  /* act tracking + accent */
  var actNum = document.getElementById('actNum'), actName = document.getElementById('actName');
  var css = getComputedStyle(root);
  function setAct(el) {
    actNum.textContent = el.dataset.act; actName.textContent = el.dataset.name;
    var c = el.dataset.pc || css.getPropertyValue(el.dataset.accent).trim();
    if (c) root.style.setProperty('--accent', c);
  }
  var watched = document.querySelectorAll('[data-act]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) setAct(en.target); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  watched.forEach(function (el) { io.observe(el); });

  /* progress + manifesto words (one rAF-throttled scroll handler) */
  var bar = document.getElementById('bar');
  var mText = document.getElementById('manifestoText'), words = [];
  var mOriginal = mText.innerHTML;
  function manifestoSetup() {
    mText.innerHTML = mOriginal; words = [];
    if (!motionOn()) return;
    function wrap(node) {
      Array.from(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part; words.push(s); frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    }
    wrap(mText); onScroll();
  }
  var ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    var p = h > 0 ? scrollY / h : 0;
    bar.style.width = (Math.round(p * 40) / 40 * 100) + '%';
    if (words.length) {
      var r = mText.getBoundingClientRect();
      var prog = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .4)));
      var lit = Math.round(prog * words.length);
      words.forEach(function (w, i) { w.classList.toggle('dim', i >= lit); });
    }
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  manifestoSetup(); onScroll();

  /* hero: portrait drawn with characters, decoded from random symbols */
  var cv = document.getElementById('ascii'), ctx = cv.getContext('2d');
  var hero = document.getElementById('inicio');
  var RAMP = " .,:-=+*<>/{}#%@";
  var NOISE = "01<>/\\{}[]#$%&*+=;:";
  var src = null, cells = [], cols = 0, rows = 0, cw = 0, ch = 0, raf = 0, t0 = 0, hover = null;
  function sample() {
    var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return false;
    var dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cols = W < 420 ? 104 : 150; cw = cv.width / cols; ch = cw * 1.7; rows = Math.floor(cv.height / ch);
    var off = document.createElement('canvas'); off.width = cols; off.height = rows; var og = off.getContext('2d');
    var sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
    // Enquadramento "contain": a foto inteira cabe na caixa, centralizada, sem cortar o rosto
    var target = cols / (rows * 1.7), sr = sw / sh, dw = cols, dh = rows;
    if (sr > target) dh = rows * target / sr; else dw = cols * sr / target;
    og.drawImage(src, 0, 0, sw, sh, (cols - dw) / 2, rows - dh, dw, dh);
    var d = og.getImageData(0, 0, cols, rows).data, lums = [], min = 1, max = 0;
    var alpha = [];
    for (var i = 0; i < cols * rows; i++) { var a = d[i * 4 + 3] / 255, l = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) / 255; alpha.push(a); lums.push(l); if (a > .5) { min = Math.min(min, l); max = Math.max(max, l); } }
    cells = lums.map(function (l, i) {
      var n = (l - min) / Math.max(.001, max - min); n = Math.pow(Math.max(0, n), 1.1);
      if (alpha[i] < .35) n = 0; else n = .14 + n * .86 * alpha[i];
      var x = i % cols, y = Math.floor(i / cols);
      return { n: n, c: RAMP.charAt(Math.round(n * (RAMP.length - 1))), x: x, y: y, at: Math.random() * .55 + (y / rows) * .45 };
    });
    return true;
  }
  function draw(k) {
    var accent = css.getPropertyValue('--accent').trim() || '#C6F432';
    ctx.fillStyle = '#0F0D1A'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = '400 ' + (cw * 1.62).toFixed(1) + 'px "Space Mono", ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'top';
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], ch_ = c.c, near = false;
      if (hover) { var dx = c.x - hover.x, dy = (c.y - hover.y) * 1.7; near = dx * dx + dy * dy < 30; }
      if (k < c.at || near) {
        if (c.n < .08 && !near) continue;
        ch_ = NOISE.charAt((Math.random() * NOISE.length) | 0);
        ctx.fillStyle = near ? 'rgba(244,241,234,.9)' : 'rgba(169,164,191,.35)';
      } else {
        if (ch_ === ' ') continue;
        ctx.fillStyle = 'rgba(244,241,234,' + (.1 + c.n * .9).toFixed(2) + ')';
      }
      ctx.fillText(ch_, c.x * cw, c.y * ch);
    }
  }
  function loop(time) {
    if (!t0) t0 = time;
    var k = Math.min(1.01, (time - t0) / 1600);
    draw(k);
    raf = (k < 1.01 || hover) ? requestAnimationFrame(loop) : 0;
  }
  function startAscii() {
    cancelAnimationFrame(raf); raf = 0;
    if (!src || !sample()) return;
    if (motionOn()) { t0 = 0; raf = requestAnimationFrame(loop); } else draw(2);
  }
  function setSource(img, note) { src = img; document.getElementById('asciiNote').textContent = note; startAscii(); }
  var ANDRE = '/img/andre-ascii.webp';
  var me = new Image(); me.onload = function () { setSource(me, 'andre.jpg'); var n = cells.filter(function (c) { return c.c !== ' '; }).length; document.getElementById('asciiCount').textContent = n.toLocaleString('pt-BR') + ' caracteres'; }; me.src = ANDRE;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!raf) draw(2); });
  cv.addEventListener('pointermove', function (e) {
    if (!fine.matches || !motionOn()) return;
    var b = cv.getBoundingClientRect();
    hover = { x: (e.clientX - b.left) / b.width * cols, y: (e.clientY - b.top) / b.height * cv.height / ch };
    if (!raf) { t0 = performance.now() - 5000; raf = requestAnimationFrame(loop); }
  });
  cv.addEventListener('pointerleave', function () { hover = null; });
  // No celular a barra de endereço some/volta na rolagem e dispara resize: só remonta se a caixa mudar de tamanho
  var rT, lastBox = cv.clientWidth + 'x' + cv.clientHeight;
  addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      var box = cv.clientWidth + 'x' + cv.clientHeight;
      if (box !== lastBox) { lastBox = box; startAscii(); }
    }, 200);
  });

  /* typed prompt */
  (function () {
    var el = document.getElementById('typed'), full = 'whoami';
    if (!motionOn()) return;
    el.textContent = ''; var i = 0;
    (function step() { if (i <= full.length) { el.textContent = full.slice(0, i++); setTimeout(step, 110); } })();
  })();

  /* projects: depixelate on entry, then stamp badges */
  function depixel(img, run) {
    var shot = img.parentNode, c = document.createElement('canvas'), g = c.getContext('2d');
    shot.appendChild(c);
    var steps = [48, 32, 20, 12, 7, 4, 2];
    function frame(s) {
      var w = img.clientWidth, h = img.clientHeight; if (!w || !h) return;
      var dpr = Math.min(2, devicePixelRatio || 1);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var sw = Math.max(1, Math.round(w / s)), sh = Math.max(1, Math.round(h / s));
      var off = frame.off || (frame.off = document.createElement('canvas'));
      off.width = sw; off.height = sh;
      var og = off.getContext('2d'); og.clearRect(0, 0, sw, sh); og.drawImage(img, 0, 0, sw, sh);
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height); g.drawImage(off, 0, 0, c.width, c.height);
    }
    function ready() {
      frame(steps[0]); img.style.opacity = '0';
      run.then(function () {
        var i = 0;
        (function next() {
          i++;
          if (i < steps.length) { frame(steps[i]); setTimeout(next, 110); }
          else { img.style.opacity = ''; c.style.opacity = '0'; setTimeout(function () { c.remove(); }, 400); }
        })();
      });
    }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
  }
  var projs = document.querySelectorAll('.proj');
  var pio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target._go) en.target._go();
      pio.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -25% 0px' });
  projs.forEach(function (p) {
    if (motionOn()) {
      var img = p.querySelector('.shot img');
      img.loading = 'eager';
      depixel(img, new Promise(function (res) { p._go = res; }));
    }
    pio.observe(p);
  });

  /* pixel cursor trail */
  var trail = document.getElementById('trail'), tg = trail.getContext('2d'), pts = [], tRaf = 0, trailOn = false;
  function trailLoop() {
    var w = innerWidth, h = innerHeight;
    if (trail.width !== w || trail.height !== h) { trail.width = w; trail.height = h; }
    tg.clearRect(0, 0, w, h);
    var col = css.getPropertyValue('--accent').trim() || '#C6F432';
    pts = pts.filter(function (p) { return (p.life -= 1) > 0; });
    pts.forEach(function (p) { tg.globalAlpha = p.life / 22; tg.fillStyle = col; tg.fillRect(p.x, p.y, 6, 6); });
    tg.globalAlpha = 1;
    tRaf = pts.length ? requestAnimationFrame(trailLoop) : 0;
  }
  function onMove(e) {
    if (!trailOn) return;
    pts.push({ x: Math.round(e.clientX / 6) * 6, y: Math.round(e.clientY / 6) * 6, life: 22 });
    if (pts.length > 40) pts.shift();
    if (!tRaf) tRaf = requestAnimationFrame(trailLoop);
  }
  function setupTrail() {
    trailOn = fine.matches && motionOn() && innerWidth >= 900;
    trail.hidden = !trailOn;
    if (!trailOn) { pts = []; tg.clearRect(0, 0, trail.width, trail.height); }
  }
  addEventListener('pointermove', onMove, { passive: true });
  setupTrail();
  reduce.addEventListener && reduce.addEventListener('change', function () { applyMotion(); startAscii(); setupTrail(); manifestoSetup(); });
})();
