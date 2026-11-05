/* Bye Bye Arc comparison page.
 * Everything browser-specific comes from browsers.json. The only fixed config
 * here is the schema: feature keys, their human labels, and column groups.
 */
(function () {
  "use strict";

  // ---------- Schema config (not data) ----------
  const ARC_FEATURES = [
    ["verticalTabs", "Vertical tabs", "Tabs live in a sidebar instead of across the top."],
    ["pinnedTabs", "Pinned tabs", "Tabs you keep stay put and come back after you close them."],
    ["tabFolders", "Tab folders", "Folders and subfolders to organize tabs in the sidebar."],
    ["spaces", "Spaces", "Separate sets of tabs for work, home or projects."],
    ["splitView", "Split view", "Two or more pages side by side in one window."],
    ["commandBar", "Command bar", "A keyboard launcher for tabs, history and actions."],
    ["autoArchiveTabs", "Auto-archive", "Tabs you haven't touched in a while tidy themselves away."],
    ["linkPreview", "Link preview", "Peek at a link without leaving the page."],
    ["miniWindow", "Mini window", "Links from other apps open in a small, quick window."],
    ["siteCustomization", "Site styling", "Restyle or tweak how a website looks."],
    ["arcImport", "Arc import", "Brings over your Arc tabs, Spaces or bookmarks."],
    ["liveFolders", "Live folders", "Sidebar folders that fill themselves from GitHub, RSS and more."],
    ["easels", "Easels", "A canvas for clipping pages, notes and sketches."],
    ["miniPlayer", "Mini player", "Video keeps playing in a small window when you switch tabs."],
    ["airTrafficControl", "Air Traffic Control", "Links open in the right Space automatically, by rule."],
    ["favorites", "Favorites", "Top tabs that show in every Space."],
  ];
  const BEYOND_FEATURES = [
    ["builtInAI", "Built-in AI", "An AI assistant built into the browser."],
    ["adBlocking", "Ad blocking", "Blocks ads without installing an extension."],
    ["chromeExtensions", "Chrome extensions", "Runs extensions from the Chrome Web Store."],
    ["sync", "Sync", "Keeps bookmarks, tabs and passwords in step across devices."],
  ];
  const FEATURE_TEXT = { yes: "Yes", partial: "Partial", no: "No", unknown: "Unknown" };
  const FEATURE_RANK = { yes: 3, partial: 2, unknown: 1, no: 0 };
  const VIBE = {
    no: { text: "No", rank: 0 },
    unknown: { text: "Unknown", rank: 1 },
    seems: { text: "Seems vibe-coded", rank: 2 },
    confirmed: { text: "Confirmed", rank: 3 },
  };
  const PLATFORM_SHORT = { macOS: "Mac", Windows: "Win", Linux: "Linux", iOS: "iOS", Android: "Android" };
  const PRICE_RANK = (p) => {
    const s = String(p || "").toLowerCase();
    if (s === "free") return 0;
    if (s.startsWith("free")) return 1;
    if (!s) return 3;
    return 2;
  };
  const isFree = (b) => /^free/i.test(String(b.price || ""));

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const camelLabel = (k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const parseDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const longDate = (d) => d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  function relativeDay(d) {
    if (!d) return "Unknown";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((today - d) / 86400000);
    if (days < 0) return "in " + plural(-days, "day");
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 45) return plural(days, "day") + " ago";
    if (days < 365) return plural(Math.round(days / 30.4), "month") + " ago";
    return plural(Math.round(days / 365), "year") + " ago";
  }
  const featureVal = (b, k) => {
    const v = b.features && b.features[k];
    return FEATURE_RANK[v] != null ? v : "unknown";
  };
  const vibeVal = (b) => (VIBE[b.vibeCoded] ? b.vibeCoded : "unknown");
  const isHttp = (u) => /^https?:/i.test(String(u || "").trim());
  const extLink = (u, text, cls) =>
    isHttp(u)
      ? `<a${cls ? ` class="${cls}"` : ""} href="${esc(String(u).trim())}" target="_blank" rel="noopener">${text}</a>`
      : `<span${cls ? ` class="${cls}"` : ""}>${text}</span>`;
  const hostOf = (u) => {
    try {
      const x = new URL(u);
      const path = x.pathname.replace(/\/$/, "");
      return x.hostname.replace(/^www\./, "") + (path.length > 1 ? path : "");
    } catch (e) {
      return u;
    }
  };

  // ---------- Theme (light by default; dark only when chosen) ----------
  const themeBtn = $("#theme-toggle");
  function applyTheme(t) {
    if (t === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // ---------- Tooltips (hover, focus, or tap) ----------
  const tipEl = $("#tip");
  const tips = new Map();
  let tipSeq = 0;
  let tipOwner = null;
  let tipPinned = false;
  let hideTimer = null;
  function registerTip(html) {
    const id = "t" + ++tipSeq;
    tips.set(id, html);
    return id;
  }
  function showTip(trigger, pinned) {
    clearTimeout(hideTimer);
    const html = tips.get(trigger.dataset.tip);
    if (!html) return;
    if (tipOwner && tipOwner !== trigger) tipOwner.removeAttribute("aria-describedby");
    tipOwner = trigger;
    tipPinned = !!pinned;
    tipEl.innerHTML = html;
    tipEl.id = "tip";
    trigger.setAttribute("aria-describedby", "tip");
    tipEl.hidden = false;
    const r = trigger.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(12, Math.min(left, vw - t.width - 12));
    let top = r.bottom + 8;
    if (top + t.height > window.innerHeight - 8) top = r.top - t.height - 8;
    tipEl.style.left = left + "px";
    tipEl.style.top = Math.max(8, top) + "px";
  }
  function hideTip() {
    clearTimeout(hideTimer);
    if (tipOwner) tipOwner.removeAttribute("aria-describedby");
    tipOwner = null;
    tipPinned = false;
    tipEl.hidden = true;
  }
  const softHide = () => {
    if (tipPinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideTip, 160);
  };
  document.addEventListener("mouseover", (e) => {
    const trg = e.target.closest(".tip-trigger");
    if (trg) { if (!tipPinned) showTip(trg, false); return; }
    if (e.target.closest("#tip")) { clearTimeout(hideTimer); return; }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".tip-trigger") || e.target.closest("#tip")) {
      const to = e.relatedTarget;
      if (to && (to.closest(".tip-trigger") === tipOwner || to.closest("#tip"))) return;
      softHide();
    }
  });
  document.addEventListener("focusin", (e) => {
    const trg = e.target.closest && e.target.closest(".tip-trigger");
    if (trg) showTip(trg, false);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.closest && e.target.closest(".tip-trigger")) {
      const to = e.relatedTarget;
      if (to && to.closest && to.closest("#tip")) return;
      softHide();
    }
  });
  document.addEventListener("click", (e) => {
    const trg = e.target.closest(".tip-trigger");
    if (trg) {
      e.preventDefault();
      if (tipOwner === trg && tipPinned) hideTip();
      else showTip(trg, true);
      return;
    }
    if (!e.target.closest("#tip")) hideTip();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true, capture: true });
  window.addEventListener("resize", hideTip);

  // ---------- State ----------
  const state = {
    sortKey: "name",
    sortDir: "asc",
    q: "",
    must: new Set(),
    partialOk: true,
    engines: new Set(),
    platforms: new Set(),
    free: false,
    oss: false,
    hideVibe: false,
  };
  let data = null;
  let arc = null;
  let rest = [];
  let groups = [];
  let columns = [];
  const openDetails = new Set();

  function arcScore(b) {
    let s = 0;
    for (const [k] of ARC_FEATURES) {
      const v = featureVal(b, k);
      if (v === "yes") s += 1;
      else if (v === "partial") s += 0.5;
    }
    return s;
  }
  const fmtScore = (s) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

  // ---------- Cell renderers ----------
  function featureCell(b, k, label) {
    const v = featureVal(b, k);
    const note = b.featureNotes && b.featureNotes[k];
    const sym = `<span class="sym sym-${v}" aria-hidden="true"></span>`;
    const sr = `<span class="sr-only">${esc(label)}: ${FEATURE_TEXT[v]}${note ? ". " + esc(note) : ""}</span>`;
    if (note) {
      const id = registerTip(`<strong>${esc(label)}: ${FEATURE_TEXT[v]}</strong>${esc(note)}`);
      return `<button type="button" class="tip-trigger" data-tip="${id}">${sym}${sr}</button>`;
    }
    return `${sym}${sr}`;
  }

  function nameCell(b, isArc) {
    const tag = isArc ? `<span class="baseline-tag">${shortSunset ? "Ends " + esc(shortSunset) : "Shutting down"}</span>` : "";
    const n = Array.isArray(b.sources) ? b.sources.length : 0;
    const open = openDetails.has(b.id);
    const name = isHttp(b.url)
      ? extLink(b.url, `${esc(b.name)}<span class="ext" aria-hidden="true">↗</span><span class="sr-only"> (opens download site in a new tab)</span>`, "b-name")
      : `<span class="b-name">${esc(b.name)}</span>`;
    return `${name}${tag}
      <span class="b-tagline">${esc(b.tagline)}</span>
      <button type="button" class="btn-link" data-details="${esc(b.id)}" aria-expanded="${open}" aria-controls="det-${esc(b.id)}">
        <span class="caret" aria-hidden="true">›</span> ${n ? plural(n, "source") : "Details"}<span class="sr-only"> for ${esc(b.name)}</span>
      </button>`;
  }

  function scoreCell(b) {
    const s = arcScore(b);
    const total = ARC_FEATURES.length;
    let bar = "";
    for (const [k] of ARC_FEATURES) {
      const v = featureVal(b, k);
      bar += `<i class="${v === "yes" ? "full" : v === "partial" ? "half" : ""}"></i>`;
    }
    return `<span class="score-num">${fmtScore(s)} <span class="of">/ ${total}</span></span>
      <span class="score-bar" aria-hidden="true">${bar}</span>`;
  }

  function priceCell(b) {
    const p = esc(b.price || "Unknown");
    if (b.priceNote) {
      const id = registerTip(`<strong>${p}</strong>${esc(b.priceNote)}`);
      return `<button type="button" class="tip-trigger has-note" data-tip="${id}">${p}<span class="sr-only">. ${esc(b.priceNote)}</span></button>`;
    }
    return p;
  }

  function engineCell(b) {
    const e = esc(b.engine || "Unknown");
    if (b.engineNote) {
      const id = registerTip(`<strong>${e}</strong>${esc(b.engineNote)}`);
      return `<button type="button" class="tip-trigger has-note" data-tip="${id}">${e}<span class="sr-only">. ${esc(b.engineNote)}</span></button>`;
    }
    return e;
  }

  function updatedCell(b) {
    const d = parseDay(b.lastUpdated);
    if (!d) return "Unknown";
    return `<time datetime="${esc(b.lastUpdated)}" title="${esc(longDate(d))}">${esc(relativeDay(d))}</time>`;
  }

  function vibeCell(b) {
    const v = vibeVal(b);
    const chip = `<span class="vibe vibe-${v}">${VIBE[v].text}</span>`;
    if (!b.vibeCodedNote && !b.vibeCodedSource) return chip;
    const src = b.vibeCodedSource
      ? `<br>${extLink(b.vibeCodedSource, `Source: ${esc(hostOf(b.vibeCodedSource))}`)}`
      : "";
    const id = registerTip(`<strong>Vibe-coded: ${VIBE[v].text}</strong>${esc(b.vibeCodedNote || "")}${src}`);
    return `<button type="button" class="tip-trigger has-note" data-tip="${id}">${chip}<span class="sr-only">. ${esc(b.vibeCodedNote || "")}</span></button>`;
  }

  function detailsRow(b) {
    const srcs = (Array.isArray(b.sources) ? b.sources : [])
      .map((u) => `<li>${extLink(u, esc(hostOf(u)))}</li>`)
      .join("");
    const bits = [];
    if (b.maker) bits.push(`Made by ${esc(b.maker)}.`);
    if (b.priceNote) bits.push(`Price: ${esc(b.priceNote)}.`);
    if (b.vibeCodedNote) bits.push(`Vibe-coded: ${esc(b.vibeCodedNote)}`);
    const vibeSrc = b.vibeCodedSource
      ? `<p>Vibe-coded source: ${extLink(b.vibeCodedSource, esc(hostOf(b.vibeCodedSource)))}</p>`
      : "";
    return `<tr class="details" id="det-${esc(b.id)}"><td colspan="${columns.length}">
      <div class="details-inner">
        <h3>Where the ${esc(b.name)} facts come from</h3>
        ${bits.length ? `<p>${bits.join(" ")}</p>` : ""}
        ${vibeSrc}
        ${srcs ? `<ul>${srcs}</ul>` : "<p>No sources listed yet.</p>"}
      </div></td></tr>`;
  }

  // ---------- Columns ----------
  function buildColumns() {
    const known = new Set([...ARC_FEATURES, ...BEYOND_FEATURES].map((f) => f[0]));
    const extra = [];
    for (const b of data.browsers) {
      for (const k of Object.keys(b.features || {})) {
        if (!known.has(k)) { known.add(k); extra.push([k, camelLabel(k), ""]); }
      }
    }
    const feat = (group) => ([k, label, desc]) => ({
      key: "f:" + k, group, label, desc, cls: "col-feature feature-cell", first: "desc",
      sort: (b) => FEATURE_RANK[featureVal(b, k)],
      render: (b) => featureCell(b, k, label),
    });
    columns = [
      { key: "name", group: "none", label: "Browser", cls: "col-name", first: "asc",
        sort: (b) => String(b.name || "").toLowerCase(), render: nameCell, rowHeader: true },
      { key: "score", group: "none", label: "Arc features", cls: "col-score", first: "desc",
        desc: `How many of Arc's ${ARC_FEATURES.length} signature features it has. Partial counts as half.`,
        sort: arcScore, render: scoreCell },
      ...ARC_FEATURES.map(feat("arc")),
      ...BEYOND_FEATURES.concat(extra).map(feat("beyond")),
      { key: "vibe", group: "trust", label: "Vibe-coded", cls: "col-vibe", first: "asc",
        desc: "Whether the browser appears to be written mostly by AI code tools.",
        sort: (b) => VIBE[vibeVal(b)].rank, render: vibeCell },
      { key: "engine", group: "basics", label: "Engine", cls: "col-engine", first: "asc",
        sort: (b) => String(b.engine || "").toLowerCase(), render: engineCell },
      { key: "platforms", group: "basics", label: "Platforms", cls: "col-platforms", first: "desc",
        sort: (b) => (b.platforms || []).length,
        render: (b) => `<span class="plats">${(b.platforms || [])
          .map((p) => `<span class="plat" title="${esc(p)}"><span aria-hidden="true">${esc(PLATFORM_SHORT[p] || p)}</span><span class="sr-only">${esc(p)}</span></span>`)
          .join("")}</span>` },
      { key: "version", group: "basics", label: "Version", cls: "col-version", first: "desc",
        sort: (b) => String(b.version || ""), cmp: (a, b) => a.localeCompare(b, undefined, { numeric: true }),
        render: (b) => esc(b.version || "Unknown") },
      { key: "updated", group: "basics", label: "Last updated", cls: "col-updated", first: "desc",
        sort: (b) => { const d = parseDay(b.lastUpdated); return d ? d.getTime() : -Infinity; }, render: updatedCell },
      { key: "price", group: "basics", label: "Price", cls: "col-price", first: "asc",
        sort: (b) => PRICE_RANK(b.price), render: priceCell },
      { key: "oss", group: "basics", label: "Open source", cls: "col-oss feature-cell", first: "desc",
        sort: (b) => (b.openSource === true ? 2 : b.openSource == null ? 1 : 0),
        render: (b) => {
          const v = b.openSource === true ? "yes" : b.openSource === false ? "no" : "unknown";
          return `<span class="sym sym-${v}" aria-hidden="true"></span><span class="sr-only">Open source: ${FEATURE_TEXT[v]}</span>`;
        } },
    ];
    groups = [
      { id: "none", label: "" },
      { id: "arc", label: "Arc features" },
      { id: "beyond", label: "Beyond Arc" },
      { id: "trust", label: "Trust" },
      { id: "basics", label: "Basics" },
    ];
    return { extra };
  }

  function renderHead() {
    let g = "";
    let i = 0;
    while (i < columns.length) {
      const gid = columns[i].group;
      if (gid === "none") {
        g += `<th class="${columns[i].cls === "col-name" ? "col-name" : ""}" aria-hidden="true"></th>`;
        i++;
        continue;
      }
      let span = 0;
      while (i + span < columns.length && columns[i + span].group === gid) span++;
      const grp = groups.find((x) => x.id === gid);
      g += `<th scope="colgroup" colspan="${span}" class="g-label g-${gid}"><span>${esc(grp.label)}</span></th>`;
      i += span;
    }
    const cols = columns
      .map((c) => {
        const active = state.sortKey === c.key;
        const aria = active ? ` aria-sort="${state.sortDir === "asc" ? "ascending" : "descending"}"` : "";
        const title = c.desc ? ` title="${esc(c.desc)}"` : "";
        return `<th scope="col" class="${c.cls.replace(" feature-cell", "")}"${aria}>
          <button type="button" class="sort" data-sort="${esc(c.key)}"${title}>${esc(c.label)}<span class="arrow" aria-hidden="true"></span></button></th>`;
      })
      .join("");
    $("#thead").innerHTML = `<tr class="groups">${g}</tr><tr class="cols">${cols}</tr>`;
  }

  function rowHtml(b, isArc) {
    const cells = columns
      .map((c) => {
        const inner = c.render(b, isArc);
        return c.rowHeader
          ? `<th scope="row" class="${c.cls}">${inner}</th>`
          : `<td class="${c.cls}">${inner}</td>`;
      })
      .join("");
    return `<tr class="${isArc ? "is-arc" : ""}">${cells}</tr>${openDetails.has(b.id) ? detailsRow(b) : ""}`;
  }

  // ---------- Filtering and sorting ----------
  function matches(b) {
    if (state.q) {
      const hay = `${b.name || ""} ${b.maker || ""}`.toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    for (const k of state.must) {
      const v = featureVal(b, k);
      if (!(v === "yes" || (state.partialOk && v === "partial"))) return false;
    }
    if (state.engines.size && !state.engines.has(b.engine)) return false;
    for (const p of state.platforms) if (!(b.platforms || []).includes(p)) return false;
    if (state.free && !isFree(b)) return false;
    if (state.oss && b.openSource !== true) return false;
    if (state.hideVibe && (b.vibeCoded === "seems" || b.vibeCoded === "confirmed")) return false;
    return true;
  }

  function sorted(list) {
    const col = columns.find((c) => c.key === state.sortKey) || columns[1];
    const dir = state.sortDir === "asc" ? 1 : -1;
    const cmp = col.cmp || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return list.slice().sort((a, b) => {
      const r = cmp(col.sort(a), col.sort(b)) * dir;
      if (r) return r;
      const s = arcScore(b) - arcScore(a);
      if (s) return s;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function activeFilterCount() {
    return (state.q ? 1 : 0) + state.must.size + state.engines.size + state.platforms.size +
      (state.free ? 1 : 0) + (state.oss ? 1 : 0) + (state.hideVibe ? 1 : 0);
  }

  function render() {
    tips.clear();
    hideTip();
    renderHead();
    const shown = sorted(rest.filter(matches));
    let body = rowHtml(arc, true) + shown.map((b) => rowHtml(b, false)).join("");
    if (!shown.length) {
      body += `<tr><td colspan="${columns.length}" class="status-cell"><div class="details-inner">
        No browser has every filter you picked. Turn one off, or
        <button type="button" class="btn-clear" data-clear>Clear filters</button></div></td></tr>`;
    }
    $("#tbody").innerHTML = body;
    const n = activeFilterCount();
    $("#match").innerHTML = `<strong>${shown.length}</strong> of ${rest.length} alternatives match`;
    $("#filter-count").textContent = n ? String(n) : "";
    $("#clear").disabled = n === 0;
    $("#show-results").textContent = `Show ${plural(shown.length, "browser")}`;
    syncWrapWidth();
  }

  function syncFade() {
    const w = $("#table-wrap");
    const more = w.scrollWidth - w.clientWidth - w.scrollLeft > 2;
    $("#table-shell").classList.toggle("can-scroll-right", more);
  }

  function syncWrapWidth() {
    syncFade();
    const w = $("#table-wrap").clientWidth;
    document.documentElement.style.setProperty("--wrap-w", w + "px");
    const g = document.querySelector(".compare tr.groups");
    if (g) document.documentElement.style.setProperty("--group-h", g.getBoundingClientRect().height + "px");
  }

  // ---------- Filter UI ----------
  function chip(name, value, label, count) {
    return `<label class="chip"><input type="checkbox" name="${name}" value="${esc(value)}"><span>${esc(label)}${
      count != null ? `<span class="count">${count}</span>` : ""}</span></label>`;
  }

  function buildFilters(extra) {
    const mh = [
      ["Arc features", ARC_FEATURES],
      ["Beyond Arc", BEYOND_FEATURES.concat(extra)],
    ]
      .map(([title, list]) => `<p class="group-name">${title}</p><div class="chips">${list
        .map(([k, label]) => chip("must", k, label)).join("")}</div>`)
      .join("");
    $("#must-have").innerHTML = mh;

    const counts = (getter) => {
      const m = new Map();
      for (const b of rest) for (const v of [].concat(getter(b) || [])) m.set(v, (m.get(v) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    };
    $("#engines").innerHTML = counts((b) => b.engine).map(([v, n]) => chip("engine", v, v, n)).join("");
    $("#platforms").innerHTML = counts((b) => b.platforms).map(([v, n]) => chip("platform", v, v, n)).join("");
  }

  function readFilters() {
    const vals = (name) => new Set([...document.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value));
    state.q = $("#q").value.trim().toLowerCase();
    state.must = vals("must");
    state.engines = vals("engine");
    state.platforms = vals("platform");
    state.partialOk = $("#partial-ok").checked;
    state.free = $("#free-only").checked;
    state.oss = $("#oss-only").checked;
    state.hideVibe = $("#hide-vibe").checked;
  }

  function clearFilters() {
    $("#q").value = "";
    document.querySelectorAll("#filters input[type=checkbox]").forEach((i) => { i.checked = i.id === "partial-ok"; });
    readFilters();
    render();
  }

  function wireUi() {
    $("#filters").addEventListener("change", () => { readFilters(); render(); });
    $("#q").addEventListener("input", () => { readFilters(); render(); });
    $("#clear").addEventListener("click", clearFilters);
    const setFiltersOpen = (open) => {
      $("#filters").classList.toggle("is-open", open);
      $("#toggle-filters").setAttribute("aria-expanded", String(open));
    };
    $("#toggle-filters").addEventListener("click", () => setFiltersOpen(!$("#filters").classList.contains("is-open")));
    $("#show-results").addEventListener("click", () => {
      setFiltersOpen(false);
      $("#toggle-filters").focus();
      $("#table-wrap").scrollIntoView({ block: "start" });
    });
    $("#thead").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sort]");
      if (!btn) return;
      const key = btn.dataset.sort;
      const col = columns.find((c) => c.key === key);
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else { state.sortKey = key; state.sortDir = col.first || "asc"; }
      render();
      const again = document.querySelector(`[data-sort="${CSS.escape(key)}"]`);
      if (again) again.focus();
    });
    $("#tbody").addEventListener("click", (e) => {
      if (e.target.closest("[data-clear]")) { clearFilters(); return; }
      const btn = e.target.closest("[data-details]");
      if (!btn) return;
      const id = btn.dataset.details;
      if (openDetails.has(id)) openDetails.delete(id); else openDetails.add(id);
      render();
      const again = document.querySelector(`[data-details="${CSS.escape(id)}"]`);
      if (again) again.focus();
    });
    window.addEventListener("resize", syncWrapWidth);
    $("#table-wrap").addEventListener("scroll", syncFade, { passive: true });
  }

  // ---------- Countdown ----------
  let shortSunset = "";
  function startCountdown(dateStr) {
    const target = parseDay(dateStr);
    const caption = $("#countdown-caption");
    if (!target) { caption.textContent = "Arc is shutting down."; return; }
    shortSunset = target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const nums = {};
    document.querySelectorAll(".cd-num").forEach((el) => { nums[el.dataset.unit] = el; });
    const pad = (n) => String(n).padStart(2, "0");
    function tick() {
      const ms = target - new Date();
      if (ms <= 0) {
        document.querySelector(".cd-units").hidden = true;
        caption.textContent = `Arc stopped working on ${longDate(target)}.`;
        return false;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      nums.d.textContent = String(d);
      nums.h.textContent = pad(Math.floor((s % 86400) / 3600));
      nums.m.textContent = pad(Math.floor((s % 3600) / 60));
      nums.s.textContent = pad(s % 60);
      const dateEl = caption.querySelector(".cd-date");
      if (dateEl) dateEl.textContent = ` on ${longDate(target)}`;
      $("#countdown").setAttribute("aria-label", `${plural(d, "day")} until Arc stops working on ${longDate(target)}`);
      return true;
    }
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
    }
  }

  // ---------- Boot ----------
  function fail(msg) {
    $("#tbody").innerHTML = `<tr><td class="status-cell">${esc(msg)}</td></tr>`;
    $("#match").textContent = "";
  }

  fetch("browsers.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`browsers.json returned ${r.status}`);
      return r.json();
    })
    .then((json) => {
      if (!json || !Array.isArray(json.browsers) || !json.browsers.length) throw new Error("browsers.json has no browsers");
      data = json;
      if (data.arcSunset && data.arcSunset.date) startCountdown(data.arcSunset.date);
      const asOf = parseDay(data.asOf);
      $("#as-of").textContent = `Data as of ${asOf ? longDate(asOf) : data.asOf || "unknown"}.`;
      arc = data.browsers[0];
      rest = data.browsers.slice(1);
      const { extra } = buildColumns();
      buildFilters(extra);
      wireUi();
      readFilters();
      render();
    })
    .catch((err) => {
      console.error(err);
      fail(`Couldn't load the browser list (${err.message}). Serve this folder over HTTP, for example with python3 -m http.server, and reload.`);
    });
})();
