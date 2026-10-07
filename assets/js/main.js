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
    // Parlamalı kıvılcımı her renk için bir kez çiz; her karede shadowBlur hesaplamak pahalı
    var sprites = {};
    function sprite(hue) {
      if (sprites[hue]) return sprites[hue];
      var len = 24, thick = 3.4, pad = 10;
      var c = document.createElement("canvas");
      c.width = (len + pad * 2) * dpr; c.height = (thick * 2 + pad * 2) * dpr;
      var g = c.getContext("2d");
      g.scale(dpr, dpr);
      g.translate(len / 2 + pad, thick + pad);
      g.fillStyle = "rgb(" + hue + ")";
      g.shadowColor = "rgba(" + hue + ",0.9)";
      g.shadowBlur = 8;
      g.beginPath();
      // ince, sivri bir parça: kül/kıvılcım
      g.moveTo(-len / 2, 0);
      g.quadraticCurveTo(0, -thick, len / 2, 0);
      g.quadraticCurveTo(0, thick, -len / 2, 0);
      g.fill();
      sprites[hue] = { img: c, w: len + pad * 2, h: thick * 2 + pad * 2, len: len, thick: thick };
      return sprites[hue];
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < embers.length; i++) {
        var e = embers[i], sp = sprite(e.hue);
        var sx = e.len / sp.len, sy = e.thick / sp.thick;
        ctx.globalAlpha = e.a;
        ctx.setTransform(dpr * sx * Math.cos(e.rot), dpr * sx * Math.sin(e.rot), -dpr * sy * Math.sin(e.rot), dpr * sy * Math.cos(e.rot), dpr * e.x, dpr * e.y);
        ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  /* ---------- Hero: etkileşimli terminal ---------- */
  var term = document.querySelector("[data-term]");
  var termData = document.getElementById("term-data");
  if (term && termData) {
    var D = JSON.parse(termData.textContent);
    var out = term.querySelector(".term__body");
    var form = term.querySelector(".term__prompt");
    var input = term.querySelector(".term__input");
    var side = term.querySelector(".term__side");
    var history = [], hIndex = 0;

    // Bir satır yaz. parts: metin ya da {text, href, cls} nesneleri
    function line(parts, cls) {
      var p = document.createElement("p");
      if (cls) p.className = cls;
      [].concat(parts).forEach(function (part) {
        if (typeof part === "string") { p.appendChild(document.createTextNode(part)); return; }
        var el = document.createElement(part.href ? "a" : "span");
        if (part.href) {
          el.href = part.href;
          if (/^https?:/.test(part.href)) { el.target = "_blank"; el.rel = "noopener"; }
        }
        if (part.cls) el.className = part.cls;
        el.textContent = part.text;
        p.appendChild(el);
      });
      out.appendChild(p);
      return p;
    }
    function say(parts) { return line(parts, "term__out"); }
    function err(text) { return line(text, "term__out term__out--err"); }
    function hl(text) { return { text: text, cls: "term__hl" }; }
    function postLine(post, i) {
      say([{ text: String(i + 1).padStart(2, " ") + "  ", cls: "term__date" }, { text: post.title, href: post.url }, "  " + post.date]);
    }
    function socialName(key) {
      return { github: "GitHub", linkedin: "LinkedIn", hackthebox: "HackTheBox" }[key] || key;
    }

    var commands = {
      help: {
        desc: "List available commands",
        run: function () {
          Object.keys(commands).forEach(function (name) {
            var c = commands[name];
            say([hl((name + (c.args ? " " + c.args : "")).padEnd(18, " ")), c.desc]);
          });
          say("Tip: use ↑/↓ for history and Tab to autocomplete.");
        }
      },
      whoami: {
        desc: "Short intro",
        run: function () { say(hl(D.name)); say(D.tagline); }
      },
      ls: {
        desc: "List published posts",
        run: function () {
          if (!D.posts.length) { say("No posts published yet."); return; }
          D.posts.forEach(postLine);
          say("To open a post: open <n>");
        }
      },
      open: {
        args: "<n>",
        desc: "Open the post with the given number",
        run: function (args) {
          var n = parseInt(args[0], 10);
          var post = D.posts[n - 1];
          if (!post) { err(args[0] ? "Post not found: " + args[0] + ". Type 'ls' to see numbers." : "Usage: open <n>"); return; }
          say("Opening: " + post.title);
          setTimeout(function () { window.location.href = post.url; }, 400);
        }
      },
      search: {
        args: "<term>",
        desc: "Search titles, categories and tags",
        run: function (args) {
          var q = args.join(" ").toLowerCase();
          if (!q) { err("Usage: search <term>"); return; }
          var found = 0;
          D.posts.forEach(function (post, i) {
            var hay = [post.title].concat(post.cats || [], post.tags || []).join(" ").toLowerCase();
            if (hay.indexOf(q) !== -1) { postLine(post, i); found++; }
          });
          if (!found) say("'" + args.join(" ") + "': no results.");
        }
      },
      contact: {
        desc: "Contact and social links",
        run: function () {
          Object.keys(D.social).forEach(function (k) {
            if (D.social[k]) say([hl(socialName(k).padEnd(12, " ")), { text: D.social[k].replace(/^https?:\/\//, ""), href: D.social[k] }]);
          });
        }
      },
      clear: {
        desc: "Clear the screen",
        run: function () { out.textContent = ""; }
      }
    };
    // Listede görünmeyen ama karşılık veren komutlar
    var aliases = { "?": "help", writeups: "ls", posts: "ls", cls: "clear", cat: "open", whois: "whoami", social: "contact", about: "whoami" };

    function run(raw) {
      var text = raw.trim();
      line([{ text: "$", cls: "term__ps" }, text]);
      if (text) { history.push(text); }
      hIndex = history.length;
      if (!text) return;
      var args = text.split(/\s+/);
      var name = args.shift().toLowerCase();
      name = aliases[name] || name;
      if (name === "sudo") { err("Permission denied: this session is read-only."); }
      else if (commands[name]) { commands[name].run(args, text); }
      else { err("command not found: " + name + ". Type 'help' for available commands."); }
      out.scrollTop = out.scrollHeight;
    }

    // Statik içeriği kaldır, etkileşimli moda geç
    term.classList.add("is-live");
    out.textContent = "";
    form.hidden = false;
    side.hidden = false;
    say(["Type a command or pick one from the list. Try ", hl("help"), "."]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run(input.value);
      input.value = "";
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" && history.length) {
        e.preventDefault();
        hIndex = Math.max(0, hIndex - 1);
        input.value = history[hIndex];
      } else if (e.key === "ArrowDown" && history.length) {
        e.preventDefault();
        hIndex = Math.min(history.length, hIndex + 1);
        input.value = history[hIndex] || "";
      } else if (e.key === "Tab") {
        var v = input.value.trim().toLowerCase();
        if (!v || v.indexOf(" ") !== -1) return;
        var matches = Object.keys(commands).filter(function (c) { return c.indexOf(v) === 0; });
        e.preventDefault();
        if (matches.length === 1) input.value = matches[0] + (commands[matches[0]].args ? " " : "");
        else if (matches.length > 1) { line([{ text: "$", cls: "term__ps" }, input.value]); say(matches.join("  ")); out.scrollTop = out.scrollHeight; }
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        out.textContent = "";
      }
    });
    // Konsolun boş bir yerine tıklayınca girişe odaklan (metin seçimini bozmadan)
    term.querySelector(".term__main").addEventListener("click", function (e) {
      if (e.target.closest("a") || String(window.getSelection())) return;
      input.focus({ preventScroll: true });
    });
    side.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-cmd]");
      if (!btn) return;
      if (btn.hasAttribute("data-fill")) {
        input.value = btn.dataset.cmd;
        input.focus({ preventScroll: true });
      } else {
        run(btn.dataset.cmd);
      }
    });
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
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var code = block.querySelector("pre");
      if (!code || !navigator.clipboard) return;
      navigator.clipboard.writeText(code.innerText.replace(/\n$/, "")).then(function () {
        btn.textContent = "Copied"; btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
      });
    });
    block.appendChild(btn);
  });

  /* ---------- Yazı: içindekiler (masaüstü + mobil) ---------- */
  var tocLists = document.querySelectorAll(".toc__list");
  if (tocLists.length) {
    var heads = document.querySelectorAll(".prose h2[id], .prose h3[id]");
    if (heads.length < 2) {
      document.querySelectorAll(".toc, .toc-m").forEach(function (el) { el.hidden = true; el.style.display = "none"; });
    } else {
      var links = [];
      tocLists.forEach(function (list) {
        heads.forEach(function (hd) {
          var li = document.createElement("li");
          if (hd.tagName === "H3") li.className = "toc__sub";
          var a = document.createElement("a");
          a.href = "#" + hd.id;
          a.textContent = hd.textContent;
          li.appendChild(a); list.appendChild(li);
          links.push(a);
        });
      });
      // Mobilde bir başlığa gidince menüyü kapat
      var tocM = document.querySelector(".toc-m");
      if (tocM) tocM.addEventListener("click", function (e) { if (e.target.closest("a")) tocM.open = false; });
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

  /* ---------- Yazı: başlık bağlantıları ---------- */
  document.querySelectorAll(".prose h2[id], .prose h3[id]").forEach(function (hd) {
    var a = document.createElement("a");
    a.className = "anchor";
    a.href = "#" + hd.id;
    a.textContent = "#";
    a.setAttribute("aria-label", "Link to this section: " + hd.textContent);
    hd.insertBefore(a, hd.firstChild);
  });

  /* ---------- Yazı: okuma ilerlemesi ---------- */
  var readbar = document.querySelector(".readbar span");
  var article = document.querySelector(".post .prose");
  if (readbar && article) {
    var ticking = false;
    function updateBar() {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      readbar.style.transform = "scaleX(" + p + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateBar); } }, { passive: true });
    window.addEventListener("resize", updateBar);
    updateBar();
  }

  /* ---------- Yazı: bağlantıyı kopyala ---------- */
  document.querySelectorAll("[data-copy-link]").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(location.href.split("#")[0]).then(function () {
        btn.textContent = "Copied"; btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = label; btn.classList.remove("is-done"); }, 1600);
      });
    });
  });

  /* ---------- Yazı: görsel açıklaması + büyütme ---------- */
  var proseImgs = document.querySelectorAll(".post .prose img");
  if (proseImgs.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Enlarged image");
    var boxImg = document.createElement("img");
    box.appendChild(boxImg);
    document.body.appendChild(box);
    function closeBox() { box.hidden = true; boxImg.removeAttribute("src"); }
    box.addEventListener("click", closeBox);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) closeBox(); });

    proseImgs.forEach(function (img) {
      // ![alt](yol "açıklama") ile verilen başlık, görselin altında açıklama olur
      if (img.title) {
        var fig = document.createElement("figure");
        fig.className = "shot";
        var cap = document.createElement("figcaption");
        cap.textContent = img.title;
        var holder = img.parentNode.tagName === "P" && img.parentNode.childNodes.length === 1 ? img.parentNode : img;
        holder.parentNode.insertBefore(fig, holder);
        fig.appendChild(img);
        fig.appendChild(cap);
        if (holder !== img) holder.remove();
      }
      if (img.closest("a")) return;
      img.classList.add("is-zoomable");
      img.addEventListener("click", function () {
        boxImg.src = img.currentSrc || img.src;
        boxImg.alt = img.alt;
        box.hidden = false;
      });
    });
  }

  /* ---------- Blog: arama + kategori filtresi ---------- */
  var q = document.getElementById("q");
  var chips = document.querySelectorAll(".chip-btn");
  if (q || chips.length) {
    var cat = "";
    var rows = document.querySelectorAll(".row");
    var empty = document.getElementById("no-results");
    function apply() {
      var term = (q && q.value || "").toLowerCase().trim();
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
      if (empty) {
        empty.hidden = shown !== 0;
        if (!empty.dataset.msg) empty.dataset.msg = empty.textContent;
        var active = document.querySelector(".chip-btn[aria-pressed=\"true\"]");
        var label = active && active.firstChild ? active.firstChild.textContent.trim() : "";
        empty.textContent = cat && !term ? "No posts in " + label + " yet." : empty.dataset.msg;
      }
    }
    if (q) q.addEventListener("input", apply);
    // "/" ile aramaya odaklan, Esc ile temizle
    if (q) {
      document.addEventListener("keydown", function (e) {
        var t = e.target;
        if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
          e.preventDefault(); q.focus();
        }
      });
      q.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { q.value = ""; apply(); q.blur(); }
      });
    }
    // Yazı sayfasındaki etiket/kategori bağlantıları ?q= ve ?cat= ile gelir
    var params = new URLSearchParams(location.search);
    if (q && params.get("q")) q.value = params.get("q");
    if (params.get("cat")) {
      var want = params.get("cat").toLowerCase();
      chips.forEach(function (c) {
        if (c.dataset.cat === want) { cat = want; chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); }); }
      });
    }
    if (params.get("q") || cat) apply();
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        cat = c.dataset.cat;
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        apply();
      });
    });
  }

  /* ---------- 404: istenen yolu göster ---------- */
  var pathEl = document.querySelector("[data-path]");
  if (pathEl) pathEl.textContent = decodeURIComponent(location.pathname).replace(/^\//, "") || "index";
})();
