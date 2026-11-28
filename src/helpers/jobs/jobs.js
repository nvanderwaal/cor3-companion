// COR3 job tracker.
// Listens (read-only) to the game's websocket, picks out taken jobs and the
// network-map server list, and shows them in a small floating panel.
// It never sends anything to the game server.
(() => {
  "use strict";

  const { esc, toMs, load, saveSoon, shadowHost, setHTML, check, shape, findProps } = window.__cor3;

  // ---------- times ----------
  // "2h 05m", "12m", "40s"; null when the time is unknown or past.
  function shortLeft(v) {
    const ms = toMs(v) - Date.now();
    if (!(ms > 0)) return null;
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m) return `${m}m`;
    return `${s}s`;
  }

  // ---------- state ----------
  const STORE_KEY = "cor3-job-tracker";
  const state = load(STORE_KEY, { jobs: {}, servers: {}, checks: {}, auto: {}, panel: { x: 20, y: 80, open: true, min: false } });
  // Raw copies of the last job lists, for checking in the console (window.__cor3JobTracker).
  const debug = { lastJobs: null, lastRecentJobs: null };
  // The market's current offers by id, for checking each job card.
  const offers = new Map();
  if (!state.auto) state.auto = {};
  window.__cor3JobTracker = { debug, state, decryptFiles, decryptCheck };
  // Kept in localStorage, so the panel and the top bar show your jobs as soon
  // as the game opens again; the game's next job list replaces them.
  const save = () => saveSoon(STORE_KEY, state);

  const isJob = (o) => o && typeof o === "object" && ["TAKEN", "COMPLETED", "FAILED"].includes(o.status) &&
    ("conditions" in o || "relatedServers" in o) && o.id != null;
  const isServer = (o) => o && typeof o === "object" && typeof o.serverIp === "string" &&
    typeof o.isAccessible === "boolean";

  function scan(node, depth) {
    if (!node || typeof node !== "object" || depth > 10) return false;
    let changed = false;
    if (Array.isArray(node)) {
      for (const x of node) changed = scan(x, depth + 1) || changed;
      return changed;
    }
    // Small push events from the market: the job's task is done (ready to
    // complete), or the job was completed and handed in.
    const action = node.event && typeof node.event.action === "string" ? node.event.action : null;
    const d = node.data && typeof node.data === "object" && !Array.isArray(node.data) ? node.data : null;
    // What the game says a file needs to decrypt (file analysis, failed decrypt).
    if (noteNeed(d) || noteNeed(node)) changed = true;
    if (action && action.startsWith("job.") && d) check("jobs", "job updates", d.jobId != null, shape(d));
    if (action && d && d.jobId != null) {
      const id = String(d.jobId);
      const job = state.jobs[id];
      if (action === "job.can-complete" && job) {
        job.canComplete = d.canComplete ?? true;
        if (job.canComplete) tickAll(job);
        changed = true;
      } else if (action === "job.completed" && job) {
        job.status = "COMPLETED";
        job.canComplete = false;
        changed = true;
      } else if (action === "job.fail" && job) {
        job.status = "FAILED";
        changed = true;
      }
    }
    // A server went into maintenance (push event).
    if (action === "maintenance" && d) {
      const s = Object.values(state.servers).find((x) =>
        (d.serverId != null && x.id === d.serverId) || (d.id != null && x.id === d.id) ||
        (d.serverIp && x.serverIp === d.serverIp));
      if (s) {
        s.isInMaintenance = true;
        if (d.maintenanceEndsAt) s.maintenanceEndsAt = d.maintenanceEndsAt;
        s.timeUntilMaintenance = null;
        changed = true;
      }
    }
    // When the market's jobs reset next.
    if (node.nextJobsResetAt && toMs(node.nextJobsResetAt) > 0) {
      state.market = { ...(state.market || {}), resetAt: node.nextJobsResetAt };
      changed = true;
    }
    // The network map's links between servers, for working out routes.
    if (Array.isArray(node.servers) && Array.isArray(node.connections)) {
      check("jobs", "network map", !node.servers.length ||
        (node.servers.some((s) => s && typeof s.serverIp === "string" && s.id != null) &&
         (!node.connections.length || node.connections.some((c) => c && "serverA" in c && "serverB" in c))),
        shape(node.servers[0]));
      const ip = {};
      let home = null;
      for (const s of node.servers) {
        if (!s || s.id == null || typeof s.serverIp !== "string") continue;
        ip[s.id] = s.serverIp;
        if (s.serverTypeName === "Home" || s.serverName === "Home Server") home = s.serverIp;
      }
      const links = [];
      for (const c of node.connections) {
        if (c && ip[c.serverA] && ip[c.serverB]) links.push([ip[c.serverA], ip[c.serverB]]);
      }
      if (home && links.length) { state.net = { home, links, at: Date.now() }; changed = true; }
    }
    if (Array.isArray(node.jobs)) {
      // Offers in the market's job tab (not taken yet).
      state.market = { ...(state.market || {}), offers: node.jobs.length, at: Date.now() };
      debug.lastJobs = node.jobs;
      offers.clear();
      for (const j of node.jobs) if (j && j.id != null) offers.set(String(j.id), j);
      changed = true;
    }
    if (Array.isArray(node.recentJobs)) {
      // Authoritative list of your taken jobs: every entry counts, even if it
      // carries fewer fields than expected; drop ones that are no longer in it.
      debug.lastRecentJobs = node.recentJobs;
      const recent = node.recentJobs.filter((j) => j && typeof j === "object" && j.id != null);
      check("jobs", "job list", !node.recentJobs.length ||
        recent.some((j) => "endTime" in j && ("conditions" in j || "relatedServers" in j)), shape(node.recentJobs[0]));
      state.market = { ...(state.market || {}), taken: recent.length, at: Date.now() };
      const keep = new Set(recent.map((j) => String(j.id)));
      for (const id of Object.keys(state.jobs)) if (!keep.has(id)) delete state.jobs[id];
      for (const j of recent) {
        const id = String(j.id);
        state.jobs[id] = { status: "TAKEN", ...state.jobs[id], ...j, _seen: Date.now() };
      }
      changed = true;
    }
    if (isJob(node)) {
      state.jobs[String(node.id)] = { ...state.jobs[String(node.id)], ...node, _seen: Date.now() };
      changed = true;
    }
    if (isServer(node)) {
      const old = state.servers[node.serverIp] || {};
      const s = {
        id: node.id, serverIp: node.serverIp, serverName: node.serverName,
        isAccessible: node.isAccessible, isReachable: node.isReachable,
        hasAdminAccess: node.hasAdminAccess, isInMaintenance: node.isInMaintenance,
        _seen: Date.now(),
      };
      // Network map extras; smaller server objects in other events leave them out.
      for (const k of ["maintenanceEndsAt", "timeUntilMaintenance", "serverDefenceRate", "serverTypeName"]) {
        s[k] = k in node ? node[k] : old[k];
      }
      if (!s.isInMaintenance && "isInMaintenance" in node) s.maintenanceEndsAt = null;
      state.servers[node.serverIp] = s;
      changed = true;
    }
    for (const k in node) {
      const v = node[k];
      if (v && typeof v === "object" && !(v instanceof Uint8Array) && !(v instanceof Date)) {
        changed = scan(v, depth + 1) || changed;
      }
    }
    return changed;
  }
  // Every decoded websocket packet (shared/socket.js).
  window.__cor3.onPacket((data) => {
    try {
      if (scan(data, 0)) { save(); render(); annotateJobCards(); window.__cor3.emit("jobs"); }
    } catch (e) { console.warn("[job tracker]", e); }
  });

  // ---------- panel ----------
  const CSS = `
    :host { all: initial; }
    .p { position: fixed; z-index: 2147483646; width: 340px; max-height: 70vh; display: flex; flex-direction: column;
         background: rgba(8,16,22,.92); border: 1px solid #2d4a55; border-radius: 6px; color: #cfe7ee;
         font: 11px/1.45 ui-monospace, Consolas, monospace; box-shadow: 0 4px 14px rgba(0,0,0,.45); }
    .h { display: flex; align-items: stretch; height: 22px; line-height: 22px; cursor: move; user-select: none;
         border-bottom: 1px solid #2d4a55; }
    .h b { flex: 1; padding: 0 8px; color: #76c1d1; letter-spacing: .05em; }
    .h button { all: unset; padding: 0 8px; border-left: 1px solid #1d3640; color: #cfe7ee; cursor: pointer; }
    .h button:hover { background: #10222b; }
    .b { overflow: auto; padding: 6px 8px; }
    .job { border: 1px solid #22363f; border-radius: 4px; padding: 6px; margin-bottom: 6px; }
    .job.ready { border-color: #2fae6a; }
    .job.done { opacity: .5; }
    .prog { height: 3px; background: #1d3640; border-radius: 2px; margin: 4px 0 2px; }
    .prog i { display: block; height: 100%; background: #ffc800; border-radius: 2px; }
    .ready .prog i { background: #2fae6a; }
    .auto { flex: none; font-size: 9px; color: #5df0a0; }
    label.chk span.auto { text-decoration: none; opacity: 1; }
    .t { display: flex; gap: 6px; align-items: baseline; }
    .t .n { flex: 1; font-weight: 700; color: #e6f6fa; }
    .badge { font-size: 10px; padding: 0 4px; border-radius: 3px; background: #1d3640; color: #76c1d1; }
    .badge.ok { background: #144d30; color: #5df0a0; }
    .badge.bad { background: #4d1b14; color: #ff8a70; }
    .badge.warn { background: #4d3510; color: #ffa040; }
    .time { color: #ffc800; font-size: 11px; }
    .sec { margin-top: 4px; color: #7f9aa3; font-size: 10px; text-transform: uppercase; }
    label { display: flex; gap: 6px; align-items: center; cursor: pointer; word-break: break-all; }
    label.chk span { text-decoration: line-through; opacity: .6; }
    label > span { flex: 1; }
    .cp { all: unset; flex: none; font-size: 10px; padding: 0 4px; border-radius: 3px; background: #1d3640; color: #76c1d1; cursor: pointer; }
    .cp:hover { background: #2d4a55; color: #e6f6fa; }
    .cp.ok { background: #144d30; color: #5df0a0; }
    .srv { display: flex; flex-wrap: wrap; gap: 3px 6px; align-items: center; }
    .srv .ip { flex: 1 1 150px; word-break: break-all; }
    .route { color: #7f9aa3; font-size: 10px; margin: 0 0 2px 8px; word-break: break-all; }
    .route .hop { color: #ffa040; }
    .empty { color: #7f9aa3; padding: 8px 0; }
    .desc { color: #9fb6bd; margin-top: 2px; }
  `;

  let host, root, panel, lastHtml = "";
  function ensurePanel() {
    if (panel && document.documentElement.contains(host)) return true;
    if (!document.body) return false;
    ({ host, root } = shadowHost("cor3-job-tracker-host", CSS));
    panel = document.createElement("div");
    panel.className = "p";
    lastHtml = "";
    root.appendChild(panel);
    document.body.appendChild(host);

    // Dragging by the header.
    let drag = null;
    panel.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".h") || e.target.closest("button")) return;
      drag = { dx: e.clientX - state.panel.x, dy: e.clientY - state.panel.y };
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      state.panel.x = Math.max(0, e.clientX - drag.dx);
      state.panel.y = Math.max(0, e.clientY - drag.dy);
      panel.style.left = state.panel.x + "px";
      panel.style.top = state.panel.y + "px";
    });
    window.addEventListener("mouseup", () => { if (drag) { drag = null; save(); } });

    panel.addEventListener("click", (e) => {
      const cp = e.target.closest("button[data-copy]");
      if (cp) {
        // The button sits inside the to-do label; don't let the click tick the checkbox.
        e.preventDefault();
        copyText(cp.dataset.copy).then((ok) => {
          cp.textContent = ok ? "copied" : "failed";
          cp.classList.toggle("ok", ok);
          clearTimeout(cp._t);
          cp._t = setTimeout(() => { cp.textContent = "copy"; cp.classList.remove("ok"); }, 1200);
        });
        return;
      }
      const btn = e.target.closest("button[data-act]");
      if (btn) {
        const act = btn.dataset.act;
        if (act === "min") state.panel.min = !state.panel.min;
        if (act === "close") state.panel.open = false;
        if (act === "clear") { state.jobs = {}; state.checks = {}; state.auto = {}; }
        save(); render();
      }
    });
    panel.addEventListener("change", (e) => {
      const cb = e.target.closest("input[data-key]");
      if (!cb) return;
      state.checks[cb.dataset.key] = cb.checked;
      delete state.auto[cb.dataset.key];
      save(); render(); markTerminal();
    });
    return true;
  }

  const copyText = (text) => window.__cor3.copyText(text);

  function timeLeft(job) {
    if (!job.endTime) return "";
    const s = Math.floor((new Date(job.endTime).getTime() - Date.now()) / 1000);
    if (s <= 0) return "expired";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  }

  // Same flattening the game uses for the job card: ips, file names, log names, files.
  function conditionItems(job) {
    const out = [];
    for (const item of job.conditions?.items || []) {
      const d = item?.details || {};
      const kind = item.type || item.action || item.kind || item.conditionType || "";
      const done = item.isCompleted ?? item.completed ?? item.isDone ?? item.done ?? (item.status ? /complete|done/i.test(item.status) : undefined);
      const push = (key, text, what) => out.push({ key, text, kind, what, done: done === true });
      if (d.ips?.length) d.ips.forEach((ip) => push(ip, ip, "ip"));
      else if (d.fileNames?.length) d.fileNames.forEach((f) => push(f, f, "file"));
      else if (d.logNames?.length) d.logNames.forEach((l) => push(l, l, "log"));
      else if (d.files?.length) d.files.forEach((f) => push(f?.id || f?.name || "", f?.name || "", "file"));
    }
    return out;
  }

  function findServer(rs) {
    if (rs.serverIp && state.servers[rs.serverIp]) return state.servers[rs.serverIp];
    return Object.values(state.servers).find((s) =>
      (rs.id && s.id === rs.id) || (rs.serverName && s.serverName === rs.serverName)) || null;
  }

  // Maintenance starting within this time gets a warning.
  const SOON_MS = 2 * 3600 * 1000;

  // ---------- program strength ----------
  // Programs have abilities (HACK, DECRYPT, ...) with a power. A HACK ability
  // can be limited to some server types, a DECRYPT ability to some file types
  // (spec.serverTypes / spec.fileTypes); without such a list it works on all.
  const pw = (x) => String(Math.round(x * 10) / 10); // power, 1 decimal
  const typeKey = (t) => String(t ?? "").trim().toLowerCase().replace(/^\./, "");
  const fits = (list, t) => !Array.isArray(list) || !list.length || !t ||
    list.some((x) => typeKey(x) === typeKey(t));
  // Installed abilities with their real power, from the loadout the loadout
  // helper last saw; null until you've opened your Loadout once.
  let memo = { L: null, out: null };
  function installed() {
    const L = window.__cor3Loadout?.state?.loadout;
    if (memo.L === L && memo.at === L?.at) return memo.out;
    const sp = L?.resources?.softwarePower;
    memo = { L, at: L?.at, out: null };
    if (!Array.isArray(sp)) return null;
    const progs = [...(L.equippedSoftware || []), ...(L.ownedSoftware || [])];
    const out = [];
    for (const p of sp) {
      const sw = progs.find((q) => q && q.id != null && q.id === p?.moduleId);
      const specs = Array.isArray(sw?.specs) ? sw.specs : sw?.specs ? [sw.specs] : [];
      for (const a of p?.abilities || []) {
        if (typeof a?.computedPower !== "number") continue;
        const type = String(a.type).toUpperCase();
        const spec = specs.find((x) => String(x?.type).toUpperCase() === type) || {};
        out.push({ type, power: a.computedPower, name: sw?.name || "",
          serverTypes: a.serverTypes || spec.serverTypes, fileTypes: a.fileTypes || spec.fileTypes });
      }
    }
    return (memo.out = out);
  }
  // Best installed power of `type` that works on server type / file type `on`:
  // a number (0 when no installed program fits), or null when the loadout isn't known.
  function bestPower(type, on, listKey) {
    const all = installed();
    if (!all) return null;
    let best = 0;
    for (const a of all) if (a.type === type && fits(a[listKey], on)) best = Math.max(best, a.power);
    return best;
  }
  // Owned but not installed programs that could do it, for the tooltip.
  function ownedFor(type, on, listKey) {
    const L = window.__cor3Loadout?.state?.loadout;
    const on2 = new Set((L?.equippedSoftware || []).map((q) => q?.id));
    return (L?.ownedSoftware || []).filter((sw) => sw && !on2.has(sw.id) &&
      (Array.isArray(sw.specs) ? sw.specs : sw.specs ? [sw.specs] : [])
        .some((x) => String(x?.type).toUpperCase() === type && fits(x[listKey], on)))
      .map((sw) => sw.name).filter(Boolean);
  }

  // Your best HACK power against this server (only programs that work on its type).
  const hackPower = (s) => bestPower("HACK", s?.serverTypeName, "serverTypes");
  const hackWord = (s, hack) => {
    if (hack !== 0) return `your HACK ${pw(hack)}`;
    const own = ownedFor("HACK", s?.serverTypeName, "serverTypes");
    return `no installed HACK program works on ${s?.serverTypeName || "this"} servers` +
      (own.length ? ` (you own ${own.join(", ")})` : "");
  };

  // Why your HACK can't beat this server's defence.
  const tooStrong = (s) => {
    const hack = hackPower(s);
    return hack === 0 ? hackWord(s, 0) : `defence ${s.serverDefenceRate} is above your HACK ${pw(hack)}`;
  };

  // ---------- decrypting ----------
  // Required DECRYPT power per file (the file's crypt rate), from what the game sends
  // when you analyse a file or a decrypt fails for lack of power: file id or name -> number.
  const needs = {};
  const DECRYPT_COND = /decrypt/i;
  const extOf = (name) => { const m = /\.([a-z0-9]+)$/i.exec(String(name || "")); return m ? m[1] : ""; };
  const numIn = (o, keys) => { for (const k of keys) if (typeof o?.[k] === "number" && o[k] > 0) return o[k]; return null; };
  const NEED_KEYS = ["cryptRate", "requiredDecryptPower", "decryptPowerRequired", "requiredPower", "encryptionLevel"];
  // Files a job asks you to decrypt: { name, ext, need }.
  function decryptFiles(job) {
    const out = [];
    for (const item of job?.conditions?.items || []) {
      const kind = String(item?.type || item?.action || item?.kind || item?.conditionType || "");
      if (!DECRYPT_COND.test(kind)) continue;
      const d = item.details || {};
      const files = (d.files || []).map((f) => ({ id: f?.id, name: f?.name || "", f }))
        .concat((d.fileNames || []).map((n) => ({ name: n })));
      if (!files.length) files.push({ name: d.fileName || "" });
      for (const f of files) {
        const ext = typeKey(d.fileExtension || d.fileType || f.f?.extension || f.f?.fileType || extOf(f.name));
        const need = numIn(f.f, NEED_KEYS) ?? numIn(d, NEED_KEYS) ?? needs[f.id] ?? needs[f.name] ?? null;
        out.push({ name: f.name, ext, need });
      }
    }
    return out;
  }
  // Can you decrypt this file now? { ok: true | false | null, text, tip }
  function decryptCheck(f) {
    const what = f.ext ? `.${f.ext}` : "this file";
    const power = bestPower("DECRYPT", f.ext, "fileTypes");
    if (power == null) return { ok: null, text: "DECRYPT ?", tip: "open your Loadout so the tracker knows your DECRYPT power" };
    if (power === 0) {
      const own = ownedFor("DECRYPT", f.ext, "fileTypes");
      return { ok: false, text: `DECRYPT ${what} &#10007;`,
        tip: `no installed program can decrypt ${what}` + (own.length ? `; install ${own.join(" or ")}` : "") };
    }
    if (f.need == null) return { ok: true, text: `DECRYPT ${pw(power)}`, tip: `your DECRYPT power for ${what} is ${pw(power)}; the game hasn't said how much this file needs yet` };
    const ok = power >= f.need;
    return { ok, text: `DECRYPT ${pw(power)}/${pw(f.need)} ${ok ? "&#10003;" : "&#10007;"}`,
      tip: ok ? `your DECRYPT ${pw(power)} beats the ${pw(f.need)} this file needs` : `this file needs DECRYPT ${pw(f.need)}, you have ${pw(power)}` };
  }
  // Why decrypting blocks this job, or [] when it doesn't.
  const decryptBlockers = (job) => decryptFiles(job).map((f) => [f, decryptCheck(f)])
    .filter(([, c]) => c.ok === false).map(([f, c]) => `${f.name || "file"}: ${c.tip}`);
  // Remember a required DECRYPT power the game told us about.
  function noteNeed(d) {
    if (!d || typeof d !== "object") return false;
    let need = null;
    if (d.kind === "insufficient_power" && String(d.ability || "DECRYPT").toUpperCase() === "DECRYPT") need = numIn(d, ["required"]);
    else if (typeof d.canDecrypt === "boolean") need = numIn(d, ["cryptRate", "requiredPower", "required"]);
    if (need == null) return false;
    let hit = false;
    for (const k of [d.fileId, d.id, d.file?.id, d.fileName, d.name, d.file?.name]) {
      if (k != null && k !== "") { needs[k] = need; hit = true; }
    }
    return hit;
  }

  // Extra facts about a server: maintenance times and defence against your HACK power.
  function serverInfo(s) {
    const out = [];
    if (s.isInMaintenance) {
      const left = shortLeft(s.maintenanceEndsAt);
      out.push({ cls: "warn", text: left ? `maintenance, ${left} left` : "maintenance", tip: "in maintenance" });
    } else {
      const ms = toMs(s.timeUntilMaintenance) - Date.now();
      if (ms > 0 && ms < SOON_MS) {
        out.push({ cls: "warn", text: `maint. in ${shortLeft(s.timeUntilMaintenance)}`, tip: "maintenance starts soon" });
      }
    }
    const def = s.serverDefenceRate;
    if (!s.isAccessible && typeof def === "number" && def > 0) {
      const hack = hackPower(s);
      out.push(hack == null
        ? { cls: "", text: `DEF ${def}`, tip: "defence rate; open your Loadout to compare with your HACK power" }
        : { cls: hack >= def ? "ok" : "bad", text: `DEF ${def} · HACK ${pw(hack)} ${hack >= def ? "&#10003;" : "&#10007;"}`,
            tip: hack >= def ? "your best HACK power for this server type beats the defence rate"
              : hack === 0 ? hackWord(s, 0) : "your best HACK power for this server type is below the defence rate" });
    }
    return out;
  }

  // ---------- routes ----------
  // A server you don't have access to is still within reach when there is a
  // way to it from Home through servers you can pass: ones you have access to,
  // or ones your HACK power beats, and none in maintenance. Fewer hacks win,
  // then fewer hops.
  const inMaint = (s) => s.isInMaintenance && !(toMs(s.maintenanceEndsAt) <= Date.now());
  function canHack(s) {
    const def = s.serverDefenceRate;
    if (typeof def !== "number" || def <= 0) return true;
    const hack = hackPower(s);
    return hack == null ? null : hack >= def;
  }
  function neighbours() {
    const adj = {};
    for (const [a, b] of state.net?.links || []) {
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    }
    return adj;
  }
  // Cheapest route from Home to target (IPs, Home and target included), or
  // null. With pass = () => true it finds the shortest route of all.
  function cheapest(target, adj, pass) {
    const home = state.net.home;
    const dist = { [home]: 0 }, prev = {}, done = new Set();
    for (;;) {
      let cur = null;
      for (const k in dist) if (!done.has(k) && (cur == null || dist[k] < dist[cur])) cur = k;
      if (cur == null) return null;
      if (cur === target) break;
      done.add(cur);
      for (const nb of adj[cur] || []) {
        if (done.has(nb)) continue;
        const cost = nb === target ? 1 : pass(nb);
        if (cost == null) continue;
        if (dist[nb] == null || dist[cur] + cost < dist[nb]) { dist[nb] = dist[cur] + cost; prev[nb] = cur; }
      }
    }
    const path = [target];
    while (path[0] !== home) path.unshift(prev[path[0]]);
    return path;
  }

  // Can you get into this server now, keeping the route in mind?
  // { ok: true | false | null (don't know yet), cls, text, tip, route }
  function reach(s) {
    if (!s) return { ok: null, cls: "", text: "? unknown", tip: "open the network map so the tracker can see this server" };
    if (inMaint(s)) return { ok: false, cls: "warn", text: "", tip: "in maintenance" };
    if (s.hasAdminAccess) return { ok: true, cls: "ok", text: "admin", tip: "admin access" };
    if (s.isAccessible) return { ok: true, cls: "ok", text: "access", tip: "access" };
    const target = canHack(s);
    const hackTip = target == null ? "open your Loadout to compare its defence with your HACK power" : "";
    if (!state.net?.home || !state.servers[state.net.home]) {
      // No links known yet: fall back to what the game says.
      return s.isReachable
        ? { ok: target, cls: "bad", text: "no access", tip: "no access" }
        : { ok: null, cls: "bad", text: "unreachable", tip: "unreachable; open the network map to work out a route" };
    }
    const adj = neighbours();
    let unsure = false;
    const route = cheapest(s.serverIp, adj, (ip) => {
      const h = state.servers[ip];
      if (!h || inMaint(h)) return null;
      if (h.isAccessible || ip === state.net.home) return 1;
      const c = canHack(h);
      if (c === false) return null;
      if (c == null) unsure = true;
      return 10; // a hack on the way
    });
    if (!route) {
      // Name the first server that blocks the shortest route.
      const any = cheapest(s.serverIp, adj, () => 1);
      let why = "no route from Home on your network map";
      for (const ip of (any || []).slice(1, -1)) {
        const h = state.servers[ip];
        if (!h) continue;
        if (inMaint(h)) { const l = shortLeft(h.maintenanceEndsAt); why = `${h.serverName || ip} is in maintenance${l ? ` (${l} left)` : ""}`; break; }
        if (canHack(h) === false && !h.isAccessible) { why = `${h.serverName || ip}: ${tooStrong(h)}`; break; }
      }
      return { ok: false, cls: "bad", text: "no route", tip: why };
    }
    const hops = route.slice(1, -1).filter((ip) => !state.servers[ip]?.isAccessible && ip !== state.net.home);
    const ok = target === false ? false : unsure || target == null ? null : true;
    const text = s.isReachable || !hops.length ? "no access" : `via ${hops.length} hack${hops.length > 1 ? "s" : ""}`;
    const tip = (hops.length ? `hack on the way: ${hops.map((ip) => state.servers[ip]?.serverName || ip).join(", ")}` : "reachable, no access yet") +
      (hackTip ? `; ${hackTip}` : "");
    return { ok, cls: ok === false ? "bad" : "warn", text, tip, route };
  }

  // The route as a short line, e.g. "Home → RM7-S4L2 → 10.0.0.7", with servers
  // you still have to hack in orange.
  function routeLine(route) {
    return route.map((ip, i) => {
      const s = state.servers[ip] || {};
      const name = esc(i === 0 ? "Home" : s.serverName || ip);
      return i && i < route.length - 1 && !s.isAccessible ? `<span class="hop">${name}</span>` : name;
    }).join(" &rarr; ");
  }

  window.__cor3JobTracker.reach = (ip) => reach(state.servers[ip]);

  function accessBadge(rs) {
    const s = findServer(rs);
    const r = reach(s);
    if (!s) return `<span class="badge" title="${esc(r.tip)}">${r.text}</span>`;
    const extra = serverInfo(s).map((i) => `<span class="badge ${i.cls}" title="${esc(i.tip)}">${i.text}</span>`).join("");
    return (r.text ? `<span class="badge ${r.cls}" title="${esc(r.tip)}">${r.text}</span>` : "") + extra;
  }

  function render() {
    if (!state.panel.open) { if (host) host.style.display = "none"; return; }
    if (!ensurePanel()) return;
    host.style.display = "";
    panel.style.left = state.panel.x + "px";
    panel.style.top = state.panel.y + "px";

    const jobs = Object.values(state.jobs).sort((a, b) => {
      const rank = (j) => (j.status === "TAKEN" ? 0 : 1);
      return rank(a) - rank(b) || String(a.endTime || "").localeCompare(String(b.endTime || ""));
    });
    const active = jobs.filter((j) => j.status === "TAKEN").length;

    let html = `<div class="h"><b>&#9670; JOBS (${active})</b>
      <button data-act="clear" title="Forget stored jobs">clear</button>
      <button data-act="min">${state.panel.min ? "+" : "&ndash;"}</button>
      <button data-act="close" title="Alt+J to reopen">&times;</button></div>`;

    if (!state.panel.min) {
      html += `<div class="b">`;
      if (!jobs.length) {
        html += state.market?.at
          ? `<div class="empty">You have no taken jobs. Accept a job in the market and it shows up here.</div>`
          : `<div class="empty">No job data yet. Open the market's job tab once so the tracker can read it.</div>`;
      }
      for (const j of jobs) {
        const done = j.status !== "TAKEN";
        const items = conditionItems(j);
        const servers = j.relatedServers || [];
        html += `<div class="job ${j.canComplete ? "ready" : ""} ${done ? "done" : ""}">
          <div class="t"><span class="n">${esc(j.name || j.id)}</span>
            ${j.canComplete ? `<span class="badge ok">READY</span>`
              : !done && items.length ? `<span class="badge">${doneCount(j, items)}/${items.length} done</span>`
              : `<span class="badge">${esc(j.status)}</span>`}</div>`;
        if (!done && j.endTime) html += `<div class="time" data-end="${esc(j.endTime)}"></div>`;
        if (!done && items.length) html += `<div class="prog"><i style="width:${j.canComplete ? 100 : Math.round(100 * doneCount(j, items) / items.length)}%"></i></div>`;
        if (j.features?.[0]) html += `<div class="desc">${esc(j.features[0])}</div>`;
        if (items.length) {
          html += `<div class="sec">To do</div>`;
          const dec = done ? [] : decryptFiles(j);
          for (const it of items) {
            const key = `${j.id}|${it.key}`;
            const chk = !!state.checks[key];
            // Files to decrypt get your DECRYPT power next to them.
            const f = !chk && DECRYPT_COND.test(it.kind) && dec.find((x) => x.name === it.text);
            const c = f && decryptCheck(f);
            const badge = c ? `<span class="badge ${c.ok === false ? "bad" : c.ok && f.need != null ? "ok" : ""}" title="${esc(c.tip)}">${c.text}</span>` : "";
            html += `<label class="${chk ? "chk" : ""}"><input type="checkbox" data-key="${esc(key)}" ${chk ? "checked" : ""}>
              <span>${it.kind ? esc(it.kind) + " " : ""}${esc(it.what)}: ${esc(it.text)}</span>${chk && state.auto[key] ? `<span class="auto" title="Ticked by the tracker when the game showed this step done">\u2713 auto</span>` : ""}${badge}${it.what === "ip" && it.text ? `<button class="cp" data-copy="${esc(it.text)}" title="Copy IP">copy</button>` : ""}</label>`;
          }
        }
        if (servers.length) {
          html += `<div class="sec">Servers</div>`;
          for (const rs of servers) {
            html += `<div class="srv"><span class="ip">${esc(rs.serverName ?? "")}${rs.serverName && rs.serverIp ? " &middot; " : ""}${esc(rs.serverIp ?? "")}</span>${accessBadge(rs)}</div>`;
            const r = reach(findServer(rs));
            if (r.route && r.route.length > 2 && r.text !== "no access") html += `<div class="route">${routeLine(r.route)}</div>`;
          }
        }
        html += `</div>`;
      }
      const seen = Object.keys(state.servers).length;
      const m = state.market;
      const when = m?.at ? new Date(m.at).toTimeString().slice(0, 5) : "";
      const reset = shortLeft(m?.resetAt);
      html += `<div class="empty">${m?.at ? `Market (${when}): ${m.offers ?? "?"} offers, ${m.taken ?? "?"} taken.<br>` : ""}${reset ? `Jobs reset in ${reset}.<br>` : ""}${seen} servers known from the network map.</div></div>`;
    }
    // Rewriting the panel resets its scroll and can swallow a click, so only
    // write it when something other than the ticking countdowns changed.
    if (html === lastHtml) return tickTimes();
    const body = panel.querySelector(".b");
    const scroll = body ? body.scrollTop : 0;
    setHTML(panel, html);
    lastHtml = html;
    tickTimes();
    const nb = panel.querySelector(".b");
    if (nb) nb.scrollTop = scroll;
  }

  // Countdowns update in place, without redrawing the panel.
  function tickTimes() {
    if (!panel) return;
    for (const el of panel.querySelectorAll(".time[data-end]")) {
      const t = timeLeft({ endTime: el.dataset.end });
      if (el.textContent !== t) el.textContent = t;
    }
  }

  // Alt+J or the toolbar menu shows or hides the panel.
  window.__cor3.helper("jobs", () => state.panel.open, (on) => { state.panel.open = on; save(); render(); });

  // ---------- access marks on the market's job cards ----------
  // The cards only show server names as text ("Servers - RM7-S4L2, 10.0.0.7"),
  // so match each name/IP against the servers seen on the network map.
  const MARK_CLASS = "cor3-jt-mark";
  const { GREEN, RED } = window.__cor3.color;
  const SERVER_TEXT = [
    '[data-component-name="JobCardCollapsedText"]',
    '[data-component-name="JobCardExpandedInfoValue"]',
    '[data-component-name="JobSideoutInfoValue"]',
  ].join(",");

  function lookupServer(token) {
    if (state.servers[token]) return state.servers[token];
    const t = token.toLowerCase();
    return Object.values(state.servers).find((s) =>
      (s.serverName || "").toLowerCase() === t || (s.serverIp || "").toLowerCase() === t) || null;
  }

  // Text of an element without our own mark.
  function ownText(el) {
    let text = "";
    for (const n of el.childNodes) if (!(n.classList && n.classList.contains(MARK_CLASS))) text += n.textContent;
    return text.trim();
  }

  // The "Servers" line of every job card: the first text line of a collapsed
  // card, and the value next to the same label in the expanded views.
  function serverLines() {
    const out = [];
    let label = null;
    for (const card of document.querySelectorAll('[data-component-name="JobCardCollapsed"]')) {
      const first = card.querySelector('[data-component-name="JobCardCollapsedText"]');
      if (!first) continue;
      const text = ownText(first);
      const i = text.indexOf(" - ");
      if (i < 0) continue;
      label = label || text.slice(0, i).trim();
      out.push({ el: first, list: text.slice(i + 3) });
    }
    for (const el of document.querySelectorAll(SERVER_TEXT)) {
      if (el.getAttribute("data-component-name") === "JobCardCollapsedText") continue;
      const labelEl = el.previousElementSibling;
      const list = ownText(el);
      const isServers = (label && labelEl && ownText(labelEl) === label) ||
        list.split(",").some((t) => lookupServer(t.trim()));
      if (isServers) out.push({ el, list });
    }
    return out;
  }

  // Why a server blocks a job right now, or null when it doesn't.
  function blocker(token) {
    const s = lookupServer(token);
    if (!s) return `${token}: not on your network map yet, open the map`;
    const r = reach(s);
    if (inMaint(s)) {
      const l = shortLeft(s.maintenanceEndsAt);
      return `${token}: in maintenance${l ? `, ${l} left` : ""}`;
    }
    if (r.ok === true) return null;
    const def = s.serverDefenceRate, hack = hackPower(s);
    if (r.ok === false && r.text !== "no route" && typeof def === "number" && hack != null && hack < def) {
      return `${token}: ${tooStrong(s)}`;
    }
    return `${token}: ${r.tip}`;
  }

  // One mark per job card: ✓ when you can do the job now (every server is
  // yours or within reach), ✗ otherwise. Hovering it says what blocks it.
  // The job behind a card, from the card's React props (or its id in the
  // market's offers and your taken jobs).
  const jobLike = (o) => o && typeof o === "object" && o.id != null && ("conditions" in o || "relatedServers" in o);
  function cardJob(el) {
    return findProps(el, (p) => {
      if (jobLike(p)) return p;
      for (const k in p) if (jobLike(p[k])) return p[k];
      const id = p.jobId ?? null;
      return id != null ? offers.get(String(id)) || state.jobs[String(id)] || null : null;
    }, 15);
  }

  function annotateJobCards() {
    for (const { el, list } of serverLines()) {
      const tokens = list.split(",").map((t) => t.trim()).filter((t) => t && t !== "N/A");
      let mark = el.querySelector(`:scope > .${MARK_CLASS}`);
      if (!tokens.length) { if (mark) mark.remove(); continue; }
      const job = cardJob(el);
      const files = job ? decryptFiles(job) : [];
      const blocks = tokens.map(blocker).filter(Boolean).concat(job ? decryptBlockers(job) : []);
      const ok = !blocks.length;
      const unsure = files.some((f) => decryptCheck(f).ok === null);
      const tip = ok
        ? "You can do this job now: every server is yours or within reach" +
          (!files.length ? "" : unsure ? "; open your Loadout to check your DECRYPT power"
            : files.every((f) => f.need != null) ? ", and your DECRYPT is strong enough"
            : ", and you have a DECRYPT program for its files (the game shows the power a file needs when you analyse it)")
        : `Blocked by:\n${blocks.join("\n")}`;
      if (!mark) {
        mark = document.createElement("span");
        mark.className = MARK_CLASS;
        mark.style.cssText = "margin-left:6px;font-weight:700;cursor:help";
        el.appendChild(mark);
      }
      const ch = ok ? "\u2713" : "\u2717";
      if (mark.textContent !== ch) mark.textContent = ch;
      mark.style.color = ok ? GREEN : RED;
      if (mark.title !== tip) mark.title = tip;
    }
  }

  // ---------- job steps inside a server's terminal ----------
  // The server terminal (SAI Terminal) lists a server's blacklisted IPs
  // (Transit Access), files and logs. Rows a taken job needs get an outline
  // (red: delete, blue: download, yellow: other), the full name on hover, and
  // their tab a dot. Steps that add something (an IP, an upload) show as a
  // hint by the tabs. A step ticks itself in the panel when its row goes away
  // after a delete, or shows up after an add, while that list stays open.
  const T_STYLE_ID = "cor3-jt-term-style";
  const T_CSS = `
    [data-cor3-jt] { position: relative !important; border-radius: 3px; }
    [data-cor3-jt="delete"] { outline: 2px solid #ff5a4f !important; outline-offset: -2px; background-color: rgba(255,90,79,.07) !important; }
    [data-cor3-jt="download"] { outline: 2px solid #4fd1e8 !important; outline-offset: -2px; background-color: rgba(79,209,232,.07) !important; }
    [data-cor3-jt="job"] { outline: 2px solid #ffc800 !important; outline-offset: -2px; background-color: rgba(255,200,0,.06) !important; }
    [data-cor3-jt]::before { content: attr(data-cor3-jt-tag); position: absolute; left: 4px; top: 1px; z-index: 2;
      font: 700 9px/13px ui-monospace, Consolas, monospace; letter-spacing: .05em; padding: 0 5px; border-radius: 2px; pointer-events: none; }
    [data-cor3-jt="delete"]::before { background: #ff5a4f; color: #1a0b0a; }
    [data-cor3-jt="download"]::before { background: #4fd1e8; color: #06171b; }
    [data-cor3-jt="job"]::before { background: #ffc800; color: #1a1400; }
    [data-cor3-jt-dot] { position: relative !important; }
    [data-cor3-jt-dot]::after { content: ""; position: absolute; top: 2px; right: 0; width: 7px; height: 7px; border-radius: 50%;
      background: #ffc800; box-shadow: 0 0 6px #ffc800; pointer-events: none; }
  `;
  const TAB_FOR = { ip: /transit/i, file: /^files?$/i, log: /^logs?$/i };
  const actionOf = (kind) => /delet|remov|eras|wipe|clear|purge/i.test(kind) ? "delete"
    : /download|steal|copy|exfil/i.test(kind) ? "download"
    : /add|upload|plant|place|insert|inject/i.test(kind) ? "add" : "job";
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();

  function doneCount(job, items) {
    return items.filter((it) => state.checks[`${job.id}|${it.key}`]).length;
  }
  function tick(key) {
    if (state.checks[key]) return false;
    state.checks[key] = true;
    state.auto[key] = true;
    return true;
  }
  function tickAll(job) {
    for (const it of conditionItems(job)) tick(`${job.id}|${it.key}`);
  }

  // The open terminal: the window around the "LOGS" / "FILES" / "TRANSIT
  // ACCESS" tab buttons.
  const leafText = (el) => el.childElementCount === 0 ? norm(el.textContent) : null;
  function findTerminal() {
    // A native text search is far cheaper than walking every element.
    const found = document.evaluate(
      "//body//text()[translate(normalize-space(), 'logs', 'LOGS')='LOGS']",
      document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    let logsTab = null;
    for (let i = 0; i < found.snapshotLength && !logsTab; i++) {
      const el = found.snapshotItem(i).parentElement;
      if (el && !el.closest('[id^="cor3-"]') && el.getClientRects().length) logsTab = el;
    }
    if (!logsTab) return null;
    let tabBar = logsTab.parentElement;
    for (let i = 0; tabBar && i < 4 && !/transit/i.test(tabBar.textContent); i++) tabBar = tabBar.parentElement;
    if (!tabBar) return null;
    let root = tabBar;
    for (let i = 0; root && i < 8; i++, root = root.parentElement) {
      if (root.querySelectorAll("button").length > 4 && root.textContent.length > tabBar.textContent.length + 40) break;
    }
    if (!root) return null;
    const tabs = {};
    for (const el of tabBar.querySelectorAll("*")) {
      const t = leafText(el);
      if (!t) continue;
      for (const k in TAB_FOR) if (TAB_FOR[k].test(t)) tabs[k] = el.closest("button, [role=tab]") || el;
    }
    return { root, tabBar, tabs };
  }

  // Which job server this terminal is: the one whose name or IP shows in it
  // outside the lists (the title next to the tabs).
  function terminalServer(term) {
    const head = norm(term.root.textContent.slice(0, 400));
    for (const j of Object.values(state.jobs)) {
      for (const rs of j.relatedServers || []) {
        if ((rs.serverName && head.includes(rs.serverName)) || (rs.serverIp && head.includes(rs.serverIp))) return rs;
      }
    }
    return null;
  }

  // The list row around a text element: the first ancestor that has
  // look-alike siblings (same tag and class) and the row's buttons, i.e. one
  // row of the list, not the name cell next to the type and size cells.
  function rowOf(el, root) {
    let cur = el;
    for (let i = 0; cur && cur !== root && i < 8; i++, cur = cur.parentElement) {
      const p = cur.parentElement;
      if (!p) break;
      const same = [...p.children].filter((c) => c.tagName === cur.tagName && c.className === cur.className);
      // A row holds its action buttons; a cell next to other cells doesn't.
      if (same.length >= 2 && cur.querySelector("button, [role=button]")) return cur;
    }
    return null;
  }

  // Text elements in the terminal whose text is exactly `text`.
  function findText(root, text) {
    const want = norm(text);
    const out = [];
    for (const el of root.querySelectorAll("*")) {
      if (el.childElementCount || el.closest('[id^="cor3-"]')) continue;
      if (norm(el.textContent) === want) out.push(el);
    }
    return out;
  }

  // The open tab: the one whose background differs from the other two.
  function activeTab(term) {
    const ks = Object.keys(term.tabs);
    if (ks.length < 3) return null;
    const bg = {};
    for (const k of ks) {
      const el = term.tabs[k];
      bg[k] = getComputedStyle(el).backgroundColor + getComputedStyle(el.parentElement).backgroundColor;
    }
    const odd = ks.filter((k) => ks.filter((o) => bg[o] === bg[k]).length === 1);
    return odd.length === 1 ? odd[0] : null;
  }

  // Steps seen in a terminal list: key -> { tab, seen }. A step only ticks
  // while the same tab stays open: its row went away (delete) or showed up (add).
  const seenRows = new Map();
  let hintHost = null, hintBox = null, lastHint = "";

  function clearMarks(keep) {
    for (const el of document.querySelectorAll("[data-cor3-jt]")) if (!keep.has(el)) {
      el.removeAttribute("data-cor3-jt"); el.removeAttribute("data-cor3-jt-tag"); el.removeAttribute("data-cor3-jt-key");
      if (el.dataset.cor3JtTitle != null) { el.title = el.dataset.cor3JtTitle; delete el.dataset.cor3JtTitle; }
    }
  }

  function markTerminal() {
    if (!document.body) return;
    if (!document.getElementById(T_STYLE_ID)) {
      const st = document.createElement("style");
      st.id = T_STYLE_ID; st.textContent = T_CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    const term = Object.keys(state.jobs).length ? findTerminal() : null;
    const marked = new Set(), dots = new Set(), adds = [];
    let changed = false;
    const rs = term && terminalServer(term);
    if (!term || !rs) seenRows.clear();
    if (term && rs) {
      const tab = activeTab(term);
      for (const job of Object.values(state.jobs)) {
        if (job.status !== "TAKEN" || !(job.relatedServers || []).some((x) =>
          (rs.serverIp && x.serverIp === rs.serverIp) || (rs.serverName && x.serverName === rs.serverName))) continue;
        for (const it of conditionItems(job)) {
          const key = `${job.id}|${it.key}`;
          if (it.done && tick(key)) changed = true;
          if (!it.text || !TAB_FOR[it.what]) continue;
          const act = actionOf(it.kind);
          const hits = tab === it.what
            ? findText(term.root, it.text).map((el) => rowOf(el, term.root)).filter(Boolean) : [];
          if (tab === it.what && !state.checks[key]) {
            const prev = seenRows.get(key);
            if (prev && prev.tab === tab) {
              if (act === "delete" && prev.seen && !hits.length && tick(key)) changed = true;
              if (act === "add" && !prev.seen && hits.length && tick(key)) changed = true;
            }
            seenRows.set(key, { tab, seen: hits.length > 0 });
          } else seenRows.delete(key);
          if (state.checks[key]) continue;
          if (term.tabs[it.what]) dots.add(term.tabs[it.what]);
          if (act === "add") { adds.push(it); continue; }
          const tag = act === "delete" ? "JOB · DELETE" : act === "download" ? "JOB · DOWNLOAD" : "JOB";
          const tip = `${it.text}\nJob "${job.name || job.id}": ${it.kind || act}`;
          for (const row of hits) {
            marked.add(row);
            if (row.getAttribute("data-cor3-jt") !== act) row.setAttribute("data-cor3-jt", act);
            if (row.getAttribute("data-cor3-jt-tag") !== tag) row.setAttribute("data-cor3-jt-tag", tag);
            if (row.getAttribute("data-cor3-jt-key") !== key) row.setAttribute("data-cor3-jt-key", key);
            if (row.dataset.cor3JtTitle == null) row.dataset.cor3JtTitle = row.title || "";
            if (row.title !== tip) row.title = tip;
          }
        }
      }
    }
    clearMarks(marked);
    for (const el of document.querySelectorAll("[data-cor3-jt-dot]")) if (!dots.has(el)) el.removeAttribute("data-cor3-jt-dot");
    for (const el of dots) if (!el.hasAttribute("data-cor3-jt-dot")) el.setAttribute("data-cor3-jt-dot", "");
    showHint(term, adds);
    if (changed) { save(); render(); window.__cor3.emit("jobs"); }
  }

  // A download leaves the server's list as it was, so a download step ticks
  // when you click the download button on its outlined row. We only watch
  // the click; the game handles it as usual.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("button");
    const row = btn && btn.closest('[data-cor3-jt="download"]');
    if (!row) return;
    const isDownload = btn.querySelector('[data-sentry-component="DownloadIcon"]') ||
      btn === row.querySelector("button");
    const key = row.getAttribute("data-cor3-jt-key");
    if (isDownload && key && tick(key)) { save(); render(); window.__cor3.emit("jobs"); setTimeout(markTerminal, 50); }
  }, true);

  // "Job: add 203.0.113.45 [copy]" under the terminal's tabs.
  function showHint(term, adds) {
    const html = term && adds.length ? adds.map((it) =>
      `<div>Job: ${it.what === "ip" ? "add" : "upload"} <b>${esc(it.text)}</b>${it.what === "ip" ? ` <button data-copy="${esc(it.text)}">copy</button>` : ""}</div>`).join("") : "";
    if (!html) { if (hintHost) hintHost.style.display = "none"; lastHint = ""; return; }
    if (!hintHost || !document.documentElement.contains(hintHost)) {
      const made = shadowHost("cor3-jt-term-hint", `
        :host { all: initial; }
        .h { position: fixed; z-index: 2147483645; background: #081016; border: 1px dashed #ffc800; border-radius: 4px;
             padding: 3px 8px; color: #ffe48a; font: 11px/1.6 ui-monospace, Consolas, monospace; }
        b { color: #fff3c4; }
        button { all: unset; font-size: 10px; padding: 0 5px; border-radius: 3px; background: #1d3640; color: #76c1d1; cursor: pointer; }
        button:hover { background: #2d4a55; color: #e6f6fa; }`);
      hintHost = made.host;
      hintBox = document.createElement("div");
      hintBox.className = "h";
      made.root.appendChild(hintBox);
      document.body.appendChild(hintHost);
      hintBox.addEventListener("click", async (e) => {
        const b = e.target.closest("button[data-copy]");
        if (!b) return;
        if (await copyText(b.dataset.copy)) { b.textContent = "copied"; setTimeout(() => { b.textContent = "copy"; }, 1200); }
      });
      lastHint = "";
    }
    hintHost.style.display = "";
    if (html !== lastHint) { setHTML(hintBox, html); lastHint = html; }
    const r = term.tabBar.getBoundingClientRect();
    hintBox.style.top = `${Math.round(r.bottom + 6)}px`;
    hintBox.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
  }

  // Countdowns tick once a second; card marks follow the game's page.
  window.__cor3.every(1000, () => {
    if (state.panel.open && !state.panel.min && Object.keys(state.jobs).length) render();
  }, "job tracker");
  window.__cor3.onDom(annotateJobCards, 250);
  window.__cor3.onDom(markTerminal, 300);
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})();
