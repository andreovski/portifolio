// Comportamento da home: fundo de quadrados por seção, acento por seção, retrato em duotone com mosaico,
// entradas animadas (revelar, decodificar texto, despixelizar), manifesto por rolagem e modo leve.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(pointer: fine)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var lite = false;
  try { lite = localStorage.getItem('lite') === '1'; } catch (e) {}
  function motionOn() { return !reduce.matches && !lite && !saveData; }

  /* ---------------- modo leve ---------------- */
  function applyMotion() {
    var on = motionOn();
    root.classList.toggle('motion', on);
    root.classList.toggle('lite', !on);
    ['liteNav', 'liteFoot'].forEach(function (id) { var b = document.getElementById(id); if (b) b.setAttribute('aria-pressed', String(lite)); });
    if (!on) revealAll();
  }
  ['liteNav', 'liteFoot'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function () {
      lite = !lite;
      try { localStorage.setItem('lite', lite ? '1' : '0'); } catch (e) {}
      applyMotion(); startPortrait(); grid.restart(); manifestoSetup();
    });
  });

  /* ---------------- relógios ---------------- */
  var clocks = document.querySelectorAll('[data-clock]');
  var fmtS, fmtM;
  try {
    fmtS = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });
    fmtM = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  } catch (e) {}
  function tick() {
    if (!fmtS) return;
    var d = new Date(), s = fmtS.format(d), m = fmtM.format(d);
    clocks.forEach(function (el) { var v = el.dataset.clock === 's' ? s : m; if (el.textContent !== v) el.textContent = v; });
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- nome da hero: glitch de entrada uma vez, tranco curto no hover ---------------- */
  var heroName = document.querySelector('.hero-name');
  if (heroName) {
    heroName.addEventListener('animationend', function (e) {
      if (e.animationName === 'glitch-in') heroName.classList.add('settled');
      else if (e.animationName === 'glitch-hover') heroName.classList.remove('jolt');
    });
    heroName.addEventListener('pointerenter', function () {
      if (!fine.matches || !heroName.classList.contains('settled') || heroName.classList.contains('jolt')) return;
      heroName.classList.add('jolt');
    });
  }

  /* ---------------- menu ---------------- */
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

  /* ---------------- seção atual: acento, menu e fundo ---------------- */
  var acts = Array.prototype.slice.call(document.querySelectorAll('main [data-act]'));
  var navLinks = document.querySelectorAll('[data-nav]');
  var curAct = -1;
  function detectAct() {
    var line = innerHeight * 0.42, idx = 0;
    for (var i = 0; i < acts.length; i++) if (acts[i].getBoundingClientRect().top <= line) idx = i;
    if (idx === curAct) return;
    curAct = idx;
    var el = acts[idx];
    root.style.setProperty('--accent', el.dataset.accent);
    navLinks.forEach(function (a) { if (a.dataset.nav === el.dataset.act) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    // o fundo mistura a cor desta seção com a da próxima que for diferente
    var next = '#c6f432';
    for (var k = idx + 1; k < acts.length; k++) if (acts[k].dataset.accent !== el.dataset.accent) { next = acts[k].dataset.accent; break; }
    grid.setColors(el.dataset.accent, next, idx === 0 ? 1 : 0.62);
  }

  /* ---------------- fundo de quadrados ---------------- */
  var grid = (function () {
    var c = document.getElementById('grid'), ctx = c.getContext('2d');
    var W = 0, H = 0, size = 14, pitch = 16, cols = 0, rows = 0;
    var cur, tgt, nxt, base, vfall, shade, raf = 0, last = 0, built = false;
    function rgb(hex) { var h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    var colA = rgb('#c6f432'), colB = rgb('#ff5e5b'), tgtA = colA.slice(), tgtB = colB.slice();
    var oldA = colA.slice(), oldB = colB.slice();
    var boost = 1, tgtBoost = 1, waveT0 = -1e9, WAVE = 1100;
    function build() {
      W = c.clientWidth; H = c.clientHeight; if (!W || !H) return false;
      var dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // no celular os quadrados ficam um pouco menores para manter a textura fina
      size = W < 600 ? 11 : 14; pitch = size + 2;
      cols = Math.ceil(W / pitch) + 1; rows = Math.ceil(H / pitch) + 1;
      var n = cols * rows, now = performance.now();
      cur = new Float32Array(n); tgt = new Float32Array(n); nxt = new Float32Array(n); base = new Float32Array(n); vfall = new Float32Array(rows);
      for (var r = 0; r < rows; r++) { var y = Math.min(1, (r * pitch) / H); vfall[r] = 1.35 * Math.pow(1 - y, 1.8) + 0.04; }
      shade = ctx.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, 'rgba(15,13,26,0)'); shade.addColorStop(0.3, 'rgba(15,13,26,0.05)');
      shade.addColorStop(0.65, 'rgba(15,13,26,0.55)'); shade.addColorStop(1, 'rgba(15,13,26,0.94)');
      for (var col = 0; col < cols; col++) for (var row = 0; row < rows; row++) {
        var i = col * rows + row;
        var f = (Math.sin(col * 0.21 + row * 0.09) + Math.sin(col * 0.06 - row * 0.17 + 1.7) + Math.sin((col + row) * 0.045 + 3.1)) / 3;
        var b = Math.pow(Math.max(0, f * 0.5 + 0.5), 1.4) * 0.75 + Math.random() * 0.25;
        base[i] = b; cur[i] = motionOn() ? 0 : b * 0.5; tgt[i] = Math.random() * b; nxt[i] = now + Math.random() * 3000;
      }
      built = true; return true;
    }
    function pick() { var r = Math.random(); return r < 0.38 ? 0 : r < 0.62 ? 0.28 : r < 0.86 ? 0.6 : 1; }
    function mix(a, b, m) { return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m]; }
    function css(v) { return 'rgb(' + (v[0] | 0) + ',' + (v[1] | 0) + ',' + (v[2] | 0) + ')'; }
    function draw(t, animate) {
      if (!built || c.clientWidth !== W || c.clientHeight !== H) { if (!build()) return; }
      var k;
      if (animate) {
        for (k = 0; k < 3; k++) { colA[k] += (tgtA[k] - colA[k]) * 0.12; colB[k] += (tgtB[k] - colB[k]) * 0.12; }
        boost += (tgtBoost - boost) * 0.06;
      } else { colA = tgtA.slice(); colB = tgtB.slice(); boost = tgtBoost; }
      // a troca de cor varre a tela na diagonal: na frente da onda fica a cor antiga, atrás a nova
      var wp = animate ? (t - waveT0) / WAVE : 2;
      var waving = wp >= 0 && wp < 1.25;
      var front = wp * 1.25 - 0.1;
      ctx.clearRect(0, 0, W, H);
      for (var col = 0; col < cols; col++) {
        var m = 0.55 * Math.pow(col / cols, 1.6);
        var newC = css(mix(colA, colB, m));
        var oldC = waving ? css(mix(oldA, oldB, m)) : newC;
        var x = col * pitch, lastFill = '';
        for (var row = 0; row < rows; row++) {
          var i = col * rows + row;
          if (animate && t > nxt[i]) { tgt[i] = pick() * base[i]; nxt[i] = t + 500 + Math.random() * 3800; }
          if (animate) cur[i] += (tgt[i] - cur[i]) * 0.14; else cur[i] = base[i] * 0.5;
          var a = (0.02 + 0.05 * vfall[row]) + cur[i] * 0.62 * vfall[row] * boost;
          var fill = newC;
          if (waving) {
            var dn = (col / cols) * 0.55 + (row / rows) * 0.45, gap = front - dn;
            if (gap < 0) fill = oldC;
            else if (gap < 0.06) a += (1 - gap / 0.06) * 0.55 * vfall[row] + 0.08;
          }
          if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.fillRect(x, row * pitch, size, size);
        }
      }
      // os quadrados mais acesos puxam para o branco: o brilho de pixel aceso
      ctx.fillStyle = '#f4f1ea';
      for (var j = 0; j < cur.length; j++) {
        var v = cur[j];
        if (v > 0.72) { var rj = j % rows; ctx.globalAlpha = (v - 0.72) * 0.55 * boost * vfall[rj]; ctx.fillRect(((j / rows) | 0) * pitch, rj * pitch, size, size); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return; // 30 fps basta para o piscar
      last = t; draw(t, true);
    }
    return {
      setColors: function (a, b, bst) {
        oldA = colA.slice(); oldB = colB.slice();
        tgtA = rgb(a); tgtB = rgb(b); tgtBoost = bst;
        waveT0 = performance.now();
        if (!raf) draw(0, false);
      },
      restart: function () {
        cancelAnimationFrame(raf); raf = 0; built = false;
        if (motionOn()) { waveT0 = performance.now(); raf = requestAnimationFrame(loop); } else draw(0, false);
      },
      resize: function () { built = false; if (!raf) draw(0, false); }
    };
  })();

  /* ---------------- manifesto: as palavras se preenchem conforme a rolagem ---------------- */
  var mText = document.getElementById('manifestoText'), words = [];
  var mOriginal = mText.innerHTML;
  function manifestoSetup() {
    mText.innerHTML = mOriginal; words = [];
    if (!motionOn()) return;
    mText.setAttribute('aria-label', mText.textContent);
    mText.innerHTML = mText.textContent.split(/(\s+)/).map(function (p) {
      return /^\s*$/.test(p) ? p : '<span class="w" aria-hidden="true">' + p + '</span>';
    }).join('');
    words = Array.prototype.slice.call(mText.querySelectorAll('.w'));
    onScroll();
  }

  var ticking = false;
  var topBar = document.querySelector('.top');
  function onScroll() {
    topBar.classList.toggle('scrolled', scrollY > 24);
    detectAct();
    if (words.length) {
      var r = mText.getBoundingClientRect();
      var prog = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (innerHeight * 0.45)));
      var lit = Math.round(prog * words.length);
      words.forEach(function (w, i) { w.classList.toggle('dim', i >= lit); });
    }
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------------- hero: retrato em duotone; onde o mouse passa, vira mosaico de quadrados ---------------- */
  var cv = document.getElementById('retrato'), pctx = cv.getContext('2d');
  var INK = [15, 13, 26], PAPER = [244, 241, 234];
  var src = null, duo = null, cells = [], pitch = 0, pRaf = 0, t0 = 0, entering = false;
  // lente do mosaico: segue o mouse com atraso e cresce/encolhe ao entrar/sair
  var lens = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0 };
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function buildPortrait() {
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h || !src) return false;
    var dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(w * dpr), H = Math.round(h * dpr);
    cv.width = W; cv.height = H;
    // "contain" encostado embaixo: a foto inteira cabe, sem cortar o rosto
    var sr = src.naturalWidth / src.naturalHeight, dw = W, dh = H;
    if (sr > W / H) dh = W / sr; else dw = H * sr;
    var dx = (W - dw) / 2, dy = H - dh;
    // a foto vem em tons de cinza; aqui ela vira duas cores: o fundo do site nas sombras e o acento da hero nas luzes
    var acc = hexRgb(cv.closest('[data-accent]').dataset.accent || '#c6f432');
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var og = off.getContext('2d'); og.drawImage(src, dx, dy, dw, dh);
    var img = og.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var k = Math.pow(d[i] / 255, 1.1);
      d[i] = INK[0] + (acc[0] - INK[0]) * k; d[i + 1] = INK[1] + (acc[1] - INK[1]) * k; d[i + 2] = INK[2] + (acc[2] - INK[2]) * k;
    }
    og.putImageData(img, 0, 0); duo = off;
    // grade do mosaico no ritmo dos quadrados do fundo
    pitch = Math.round((w < 600 ? 9 : 11) * dpr);
    var cols = Math.ceil(W / pitch), rows = Math.ceil(H / pitch);
    var sm = document.createElement('canvas'); sm.width = cols; sm.height = rows;
    var sg = sm.getContext('2d'); sg.drawImage(src, dx / pitch, dy / pitch, dw / pitch, dh / pitch);
    var sd = sg.getImageData(0, 0, cols, rows).data;
    cells = [];
    for (var j = 0; j < cols * rows; j++) {
      var a = sd[j * 4 + 3] / 255; if (a < .5) continue;
      var v = sd[j * 4] / 255, cx = j % cols, cy = (j / cols) | 0;
      cells.push({ x: cx * pitch, y: cy * pitch, v: v, fill: v > .78 ? 'rgb(' + PAPER + ')' : 'rgb(' + acc + ')', at: Math.random() * .6 + (cy / rows) * .4 });
    }
    return true;
  }
  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function drawPortrait(k) {
    pctx.globalCompositeOperation = 'source-over'; pctx.globalAlpha = 1;
    pctx.clearRect(0, 0, cv.width, cv.height);
    pctx.drawImage(duo, 0, 0);
    if (k >= 1.2 && lens.r < 1) return;
    var gap = Math.max(1, Math.round(pitch * .14)), full = pitch - gap, R = lens.r, R2 = R * R;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], m = 0;
      // entrada: cada quadrado se resolve na foto num momento, de cima para baixo com sorteio
      if (k < c.at) m = 1; else if (k < c.at + .18) m = 1 - (k - c.at) / .18;
      if (R > 1) {
        var ddx = c.x + pitch / 2 - lens.x, ddy = c.y + pitch / 2 - lens.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2) m = Math.max(m, smooth(R, R * .5, Math.sqrt(d2)));
      }
      if (m <= .01) continue;
      // apaga a foto embaixo do quadrado e desenha o quadrado do tamanho do brilho
      pctx.globalCompositeOperation = 'destination-out'; pctx.globalAlpha = m;
      pctx.fillRect(c.x, c.y, pitch, pitch);
      var s = Math.round(full * Math.pow(c.v, .85));
      if (s < 1) continue;
      pctx.globalCompositeOperation = 'source-over';
      pctx.fillStyle = c.fill;
      pctx.fillRect(c.x + (pitch - s) / 2, c.y + (pitch - s) / 2, s, s);
    }
    pctx.globalCompositeOperation = 'source-over'; pctx.globalAlpha = 1;
  }
  function portraitLoop(time) {
    if (!t0) t0 = time;
    var k = entering ? Math.min(1.2, (time - t0) / 1400) : 1.2;
    if (k >= 1.2) entering = false;
    lens.x += (lens.tx - lens.x) * .22; lens.y += (lens.ty - lens.y) * .22; lens.r += (lens.tr - lens.r) * .16;
    if (lens.tr === 0 && lens.r < 1) lens.r = 0;
    drawPortrait(k);
    pRaf = (entering || lens.r > 0 || lens.tr > 0) ? requestAnimationFrame(portraitLoop) : 0;
  }
  function startPortrait() {
    cancelAnimationFrame(pRaf); pRaf = 0;
    if (!src || !buildPortrait()) return;
    lens.r = lens.tr = 0;
    if (motionOn()) { t0 = 0; entering = true; pRaf = requestAnimationFrame(portraitLoop); } else drawPortrait(2);
  }
  var me = new Image();
  me.onload = function () { src = me; startPortrait(); };
  me.src = '/img/andre-duo.webp';
  cv.addEventListener('pointermove', function (e) {
    if (!fine.matches || !motionOn() || !duo) return;
    var b = cv.getBoundingClientRect(), sx = cv.width / b.width;
    lens.tx = (e.clientX - b.left) * sx; lens.ty = (e.clientY - b.top) * sx;
    if (lens.tr === 0) { lens.x = lens.tx; lens.y = lens.ty; }
    lens.tr = 120 * sx;
    if (!pRaf) pRaf = requestAnimationFrame(portraitLoop);
  });
  cv.addEventListener('pointerleave', function () { lens.tr = 0; });

  // No celular a barra de endereço some/volta na rolagem e dispara resize: só remonta o que mudou de tamanho
  var rT, lastBox = cv.clientWidth + 'x' + cv.clientHeight, lastW = innerWidth;
  addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      var box = cv.clientWidth + 'x' + cv.clientHeight;
      if (box !== lastBox) { lastBox = box; startPortrait(); }
      if (innerWidth !== lastW) { lastW = innerWidth; grid.resize(); }
      curAct = -1; onScroll();
    }, 200);
  });

  /* ---------------- prompt digitado ---------------- */
  (function () {
    var el = document.getElementById('typed'), full = 'whoami';
    if (!motionOn()) return;
    el.textContent = ''; var i = 0;
    setTimeout(function step() { if (i <= full.length) { el.textContent = full.slice(0, i++); setTimeout(step, 90); } }, 300);
  })();

  /* ---------------- textos que decodificam ---------------- */
  var GLYPHS = '!<>-_\\/[]{}=+*^?#01%&';
  function scramble(el, delay) {
    if (el._sc) return; el._sc = true;
    if (!motionOn()) return;
    var final = el.textContent, len = final.length;
    if (!el.hasAttribute('aria-label') && /^H\d$/.test(el.tagName)) el.setAttribute('aria-label', final);
    // cada letra se fixa num momento; antes disso mostra um símbolo qualquer
    var dur = Math.min(900, 260 + len * 18), at = [];
    for (var i = 0; i < len; i++) at.push((i / len) * dur * 0.6 + Math.random() * dur * 0.4);
    var start = performance.now() + (delay || 0), lastF = 0;
    function out(now) {
      var s = '';
      for (var i = 0; i < len; i++) {
        var ch = final[i];
        s += (ch === ' ' || now - start >= at[i]) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = s;
    }
    out(start);
    (function frame(now) {
      if (now - start >= dur) { el.textContent = final; return; }
      if (now - lastF > 45) { lastF = now; out(now); }
      requestAnimationFrame(frame);
    })(performance.now());
  }

  /* ---------------- projetos: imagem despixeliza ao entrar ---------------- */
  function depixel(img, delay) {
    var pic = img.parentNode, c = document.createElement('canvas'), g = c.getContext('2d');
    pic.appendChild(c);
    var steps = [40, 26, 16, 10, 6, 3];
    var off = document.createElement('canvas');
    function frame(s) {
      var w = img.clientWidth, h = img.clientHeight; if (!w || !h) return;
      var dpr = Math.min(2, devicePixelRatio || 1);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var sw = Math.max(1, Math.round(w / s)), sh = Math.max(1, Math.round(h / s));
      off.width = sw; off.height = sh;
      var og = off.getContext('2d'); og.clearRect(0, 0, sw, sh); og.drawImage(img, 0, 0, sw, sh);
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height); g.drawImage(off, 0, 0, c.width, c.height);
    }
    function go() {
      frame(steps[0]); img.style.opacity = '0';
      setTimeout(function () {
        var i = 0;
        (function next() {
          i++;
          if (i < steps.length) { frame(steps[i]); setTimeout(next, 95); }
          else { img.style.opacity = ''; c.style.opacity = '0'; setTimeout(function () { c.remove(); }, 400); }
        })();
      }, delay);
    }
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  }

  /* ---------------- projetos: galeria que abre no próprio cartão ---------------- */
  var galleries = [];
  document.querySelectorAll('.work.has-gallery').forEach(function (card) {
    var btn = card.querySelector('.expand'), gal = card.querySelector('.gallery'), track = gal.querySelector('.gal-track');
    var slides = Array.prototype.slice.call(track.children), segs = gal.querySelectorAll('.gal-seg span');
    var count = gal.querySelector('.gal-count b'), prev = gal.querySelector('.gal-prev'), next = gal.querySelector('.gal-next');
    var idx = 0, ticking = false;
    function update() {
      ticking = false;
      var max = track.scrollWidth - track.clientWidth, x = track.scrollLeft;
      // a imagem atual é a que encosta no começo do rolo; no fim do rolo, a última
      var best = 0;
      for (var i = 0; i < slides.length; i++) if (slides[i].offsetLeft - 20 <= x) best = i;
      if (x >= max - 2) best = slides.length - 1;
      idx = best;
      count.textContent = String(best + 1).padStart(2, '0');
      segs.forEach(function (s, i) { s.classList.toggle('on', i <= best); });
      prev.disabled = x <= 2; next.disabled = x >= max - 2;
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - parseFloat(getComputedStyle(track).scrollPaddingLeft || 0), behavior: motionOn() ? 'smooth' : 'auto' });
    }
    function setOpen(open) {
      if (open === card.classList.contains('open')) return;
      if (open) galleries.forEach(function (g) { if (g.card !== card) g.close(true); });
      function apply() {
        card.classList.toggle('open', open);
        gal.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        if (open) { track.scrollLeft = 0; update(); }
      }
      // depois que o layout muda, leva o cartão para o topo da tela
      function after() {
        var top = card.getBoundingClientRect().top;
        if (open || top < 0) card.scrollIntoView({ block: 'start', behavior: motionOn() ? 'smooth' : 'auto' });
        (open ? gal.querySelector('.gal-close') : btn).focus({ preventScroll: true });
      }
      if (document.startViewTransition && motionOn()) document.startViewTransition(apply).updateCallbackDone.then(after);
      else { apply(); after(); }
    }
    btn.addEventListener('click', function () { setOpen(true); });
    gal.querySelector('.gal-close').addEventListener('click', function () { setOpen(false); });
    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx + 1); });
    track.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    gal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); }
      else if (e.key === 'ArrowRight' && e.target === track) { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft' && e.target === track) { e.preventDefault(); go(idx - 1); }
    });
    galleries.push({ card: card, close: function () { card.classList.remove('open'); gal.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  });

  /* ---------------- quem entra na tela ganha .in ---------------- */
  function enter(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    var d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    if (el.matches('[data-rv="work"]')) {
      var img = el.querySelector('.pic img');
      if (img && motionOn()) depixel(img, d * 120 + 380);
      var scn = el.querySelector('[data-scramble]'); if (scn) scramble(scn, d * 120 + 300);
    }
    if (el.matches('[data-scramble]')) scramble(el, 0);
    if (el.classList.contains('sec')) el.querySelectorAll('.sec-head [data-scramble], .sec-num [data-scramble], .cell > [data-scramble]').forEach(function (s, i) { scramble(s, i * 120); });
    if (el.classList.contains('hazard')) scramble(document.getElementById('granted'), 0);
  }
  function revealAll() {
    document.querySelectorAll('[data-rv], .sec, .hazard').forEach(function (el) { el.classList.add('in'); });
  }
  var targets = document.querySelectorAll('main [data-rv], .sec, .hazard');
  if ('IntersectionObserver' in window && motionOn()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { enter(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    targets.forEach(function (el) {
      // a hero entra na hora, em sequência pelo --d de cada item
      if (el.closest('.hero')) el.classList.add('in'); else io.observe(el);
    });
  } else revealAll();

  /* no celular não há hover: o cartão que está no meio da tela ganha cor */
  if (!fine.matches && 'IntersectionObserver' in window) {
    var lio = new IntersectionObserver(function (es) { es.forEach(function (en) { en.target.classList.toggle('lit', en.isIntersecting); }); }, { rootMargin: '-35% 0px -35% 0px' });
    document.querySelectorAll('.work').forEach(function (w) { lio.observe(w); });
  }

  applyMotion();
  manifestoSetup();
  grid.restart();
  onScroll();
  reduce.addEventListener && reduce.addEventListener('change', function () { applyMotion(); startPortrait(); grid.restart(); manifestoSetup(); });
})();
