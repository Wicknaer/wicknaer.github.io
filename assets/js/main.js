/* 0xBahadir: küçük, bağımlılıksız yardımcılar */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero: kırmızı kıvılcımlar ---------- */
  var canvas = document.querySelector(".hero__embers");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, embers = [];

    function size() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(randomY) {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + 20,
        len: 6 + Math.random() * 18,        // kıvılcım boyu
        thick: 1 + Math.random() * 2.4,
        vy: 0.25 + Math.random() * 0.9,     // yukarı hız
        vx: -0.15 + Math.random() * 0.5,
        rot: Math.random() * Math.PI,
        vr: (-0.5 + Math.random()) * 0.02,
        a: 0.25 + Math.random() * 0.6,
        hue: Math.random() < 0.8 ? "229,36,63" : "255,120,140"
      };
    }
    function init() {
      size();
      var count = Math.round(Math.min(70, Math.max(24, w / 18)));
      embers = [];
      for (var i = 0; i < count; i++) embers.push(spawn(true));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < embers.length; i++) {
        var e = embers[i];
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        ctx.fillStyle = "rgba(" + e.hue + "," + e.a + ")";
        ctx.shadowColor = "rgba(" + e.hue + ",0.9)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        // ince, sivri bir parça: kül/kıvılcım
        ctx.moveTo(-e.len / 2, 0);
        ctx.quadraticCurveTo(0, -e.thick, e.len / 2, 0);
        ctx.quadraticCurveTo(0, e.thick, -e.len / 2, 0);
        ctx.fill();
        ctx.restore();
      }
    }
    function step() {
      for (var i = 0; i < embers.length; i++) {
        var e = embers[i];
        e.y -= e.vy; e.x += e.vx; e.rot += e.vr;
        if (e.y < -30 || e.x > w + 30) embers[i] = spawn(false);
      }
      draw();
      if (running) requestAnimationFrame(step);
    }
    var running = false;
    init();
    if (reduceMotion) {
      draw(); // hareketsiz tek kare
    } else {
      // sadece hero ekrandayken çalış
      var io = new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(step); }
        else if (!vis) running = false;
      });
      io.observe(canvas);
    }
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { init(); if (!running) draw(); }, 150); });
  }

  /* ---------- Kod blokları: dil etiketi + kopyala ---------- */
  document.querySelectorAll(".prose div.highlighter-rouge").forEach(function (block) {
    var m = block.className.match(/language-(\S+)/);
    if (m && m[1] !== "plaintext") {
      var lang = document.createElement("span");
      lang.className = "code-lang";
      lang.textContent = m[1];
      block.appendChild(lang);
    }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "Kopyala";
    btn.addEventListener("click", function () {
      var code = block.querySelector("pre");
      if (!code || !navigator.clipboard) return;
      navigator.clipboard.writeText(code.innerText.replace(/\n$/, "")).then(function () {
        btn.textContent = "Kopyalandı"; btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Kopyala"; btn.classList.remove("is-done"); }, 1600);
      });
    });
    block.appendChild(btn);
  });

  /* ---------- İçindekiler ---------- */
  var toc = document.querySelector(".toc");
  if (toc) {
    var heads = document.querySelectorAll(".prose h2[id], .prose h3[id]");
    if (heads.length < 2) {
      toc.hidden = true;
    } else {
      var list = toc.querySelector(".toc__list");
      var links = [];
      heads.forEach(function (hd) {
        var li = document.createElement("li");
        if (hd.tagName === "H3") li.className = "toc__sub";
        var a = document.createElement("a");
        a.href = "#" + hd.id;
        a.textContent = hd.textContent;
        li.appendChild(a); list.appendChild(li);
        links.push(a);
      });
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id); });
          }
        });
      }, { rootMargin: "-80px 0px -70% 0px" });
      heads.forEach(function (hd) { spy.observe(hd); });
    }
  }

  /* ---------- Blog: arama + kategori filtresi ---------- */
  var q = document.getElementById("q");
  var chips = document.querySelectorAll(".chip-btn");
  if (q || chips.length) {
    var cat = "";
    var rows = document.querySelectorAll(".row");
    var empty = document.getElementById("no-results");
    function apply() {
      var term = (q && q.value || "").toLocaleLowerCase("tr").trim();
      var shown = 0;
      rows.forEach(function (r) {
        var okText = !term || r.dataset.title.indexOf(term) !== -1;
        var okCat = !cat || r.dataset.cats.split("|").indexOf(cat) !== -1;
        var ok = okText && okCat;
        r.hidden = !ok;
        if (ok) shown++;
      });
      document.querySelectorAll(".year").forEach(function (y) {
        y.hidden = !y.querySelector(".row:not([hidden])");
      });
      if (empty) empty.hidden = shown !== 0;
    }
    if (q) q.addEventListener("input", apply);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        cat = c.dataset.cat;
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        apply();
      });
    });
  }
})();
