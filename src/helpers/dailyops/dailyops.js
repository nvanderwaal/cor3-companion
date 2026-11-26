// COR3 daily ops helper: the two daily ops puzzles.
// - System Log Integrity: outlines the log lines that break the log format,
//   with the reason on each, and in the fix step the error buttons to press.
//   You tick the lines and press the buttons yourself.
// - Signal Decode: turns the pulses on screen into the code, outlines the
//   encoding to pick, and types the code into the code box. You press
//   Confirm yourself.
// It only reads what is on screen (nothing hidden) and never presses a
// button or sends anything. Alt+D or the menus toggle it.
(() => {
  "use strict";
  const { load, save, color, esc } = window.__cor3;

  const NOTE_CLASS = "cor3-daily-note", MARK_ATTR = "data-cor3-daily";
  const STORE_KEY = "cor3-dailyops-helper";
  const state = load(STORE_KEY, { enabled: true });

  // ---------- System Log Integrity ----------
  // A good line: "[HH:MM:SS] TYPE /sector=1-256 /status=OK|WARN|ERROR".
  const TYPES = new Set(["AUTH", "TEMP-SYNC", "SCAN", "ROUTE-CHECK", "RADIO-TEST", "PING", "SYNC"]);
  const STATUSES = new Set(["OK", "WARN", "ERROR"]);
  // The game's error buttons, and the short reason shown on a line.
  const ERRORS = {
    TIME: { button: "Time format is incorrect", short: "time" },
    TYPE: { button: "Event type is incorrect", short: "type" },
    MISSING_SECTOR: { button: "Missing /sector parameter", short: "no /sector" },
    MISSING_STATUS: { button: "Missing /status parameter", short: "no /status" },
    SECTOR_BAD: { button: "/sector parameter is incorrect", short: "/sector" },
    STATUS_BAD: { button: "/status parameter is incorrect", short: "/status" },
  };
  // Live .error-type-button order: invalid_time, invalid_event_type,
  // missing_sector, missing_status, invalid_sector, invalid_status.
  const ERROR_BUTTON_ORDER = ["TIME", "TYPE", "MISSING_SECTOR", "MISSING_STATUS", "SECTOR_BAD", "STATUS_BAD"];

  function errorButtonIndexes(errorCodes, buttonTexts) {
    const codes = new Set(errorCodes);
    if (buttonTexts.length === ERROR_BUTTON_ORDER.length) {
      const indexes = [];
      for (let i = 0; i < buttonTexts.length; i++) {
        if (codes.has(ERROR_BUTTON_ORDER[i])) indexes.push(i);
      }
      return indexes;
    }
    const labels = new Set([...codes].map((code) => ERRORS[code].button));
    const indexes = [];
    for (let i = 0; i < buttonTexts.length; i++) {
      if (labels.has(String(buttonTexts[i] ?? "").trim())) indexes.push(i);
    }
    return indexes;
  }

  // The errors in one log line, each { code, detail }.
  function checkLine(raw) {
    const out = [];
    const add = (code, detail) => out.push({ code, detail });
    let rest = String(raw || "").trim();
    const t = rest.match(/^\[(\d{2}):(\d{2}):(\d{2})\]\s*/);
    if (!t) add("TIME", "no [HH:MM:SS]");
    else {
      const [h, m, s] = [t[1], t[2], t[3]].map(Number);
      if (h > 23) add("TIME", `hour ${t[1]}`);
      else if (m > 59) add("TIME", `minute ${t[2]}`);
      else if (s > 59) add("TIME", `second ${t[3]}`);
      rest = rest.slice(t[0].length);
    }
    const ty = rest.match(/^([A-Za-z-]+)/);
    if (!ty) add("TYPE", "no type");
    else {
      if (!TYPES.has(ty[1])) add("TYPE", ty[1]);
      rest = rest.slice(ty[0].length);
    }
    const sector = rest.match(/(?:^|\s)\/sector=(\S*)/);
    const status = rest.match(/(?:^|\s)\/status=(\S*)/);
    if (!sector) add("MISSING_SECTOR", "");
    else if (!/^\d+$/.test(sector[1]) || +sector[1] < 1 || +sector[1] > 256) add("SECTOR_BAD", sector[1] || "empty");
    if (!status) add("MISSING_STATUS", "");
    else if (!STATUSES.has(status[1])) add("STATUS_BAD", status[1] || "empty");
    return out;
  }

  // A line's text, without the reason tag we add to it.
  function lineText(el) {
    const span = el.querySelector(`span:not(.${NOTE_CLASS}-tag)`);
    if (span) return (span.textContent || "").trim();
    const tagEl = el.querySelector(`:scope > .${NOTE_CLASS}-tag`);
    const text = el.textContent || "";
    return (tagEl ? text.slice(0, text.length - tagEl.textContent.length) : text).trim();
  }
  const reasons = (errs) => errs.map((e) => (e.detail ? `${ERRORS[e.code].short}: ${e.detail}` : ERRORS[e.code].short)).join(" · ");

  function logStep() {
    const box = document.querySelector(".log-entries");
    if (box) {
      const entries = [...box.querySelectorAll(".log-entry")];
      let bad = 0;
      for (const el of entries) {
        const errs = checkLine(lineText(el));
        if (!errs.length) continue;
        bad++;
        mark(el, color.RED);
        tag(el, reasons(errs));
      }
      if (entries.length) note(box, bad
        ? `<span style="color:${color.RED}">${bad} bad line${bad > 1 ? "s" : ""}</span> outlined, the reason on each. Tick ${bad > 1 ? "them" : "it"}, then confirm.`
        : `<span style="color:${color.GREEN}">Every line looks valid.</span>`);
    }
    // The fix step: one block per ticked line, with a button per error type.
    for (const block of document.querySelectorAll(".analysis-container .error-analysis-block")) {
      const shown = block.querySelector(".log-line-display");
      const errs = shown ? checkLine(shown.textContent) : [];
      const buttons = [...block.querySelectorAll(".error-type-button")];
      const markAt = new Set(errorButtonIndexes(errs.map((e) => e.code), buttons.map((b) => b.textContent)));
      for (let i = 0; i < buttons.length; i++) if (markAt.has(i)) mark(buttons[i], color.CYAN);
    }
  }

  // ---------- Signal Decode ----------
  // S = short pulse, L = long. Morse digits are 5 pulses, binary digits 4
  // (S = 0, L = 1).
  const MORSE = { LLLLL: "0", SLLLL: "1", SSLLL: "2", SSSLL: "3", SSSSL: "4",
    SSSSS: "5", LSSSS: "6", LLSSS: "7", LLLSS: "8", LLLLS: "9" };
  const BINARY = { SSSS: "0", SSSL: "1", SSLS: "2", SSLL: "3", SLSS: "4",
    SLSL: "5", SLLS: "6", SLLL: "7", LSSS: "8", LSSL: "9" };
  const ENCODINGS = [
    { id: "morse", name: "Morse", size: 5, map: MORSE, option: /morse/i },
    { id: "binary", name: "Binary", size: 4, map: BINARY, option: /binary/i },
  ];

  function readPulses(timeline) {
    return [...timeline.querySelectorAll(".pulse-group")].map((g) =>
      g.querySelector(".pulse-bar.short") ? "S" : g.querySelector(".pulse-bar.long") ? "L" : "?").join("");
  }

  // The encodings the pulses decode cleanly in: [{ enc, code }].
  function decodeSignal(pulses) {
    const out = [];
    for (const enc of ENCODINGS) {
      if (!pulses.length || pulses.length % enc.size) continue;
      let code = "";
      for (let i = 0; i < pulses.length; i += enc.size) {
        const d = enc.map[pulses.slice(i, i + enc.size)];
        if (d == null) { code = null; break; }
        code += d;
      }
      if (code != null) out.push({ enc, code });
    }
    // 40 pulses can read as both; the game uses binary there.
    if (out.length > 1 && pulses.length === 40) return out.filter((r) => r.enc.id === "binary");
    return out;
  }

  // Kept after the pulses leave the screen, for the encoding and code steps.
  let signal = null; // { pulses, results }
  let filled = "";   // what we last typed, so we never overwrite the player's typing

  function signalStep() {
    const timeline = document.querySelector(".pulse-timeline");
    if (timeline) {
      const pulses = readPulses(timeline);
      if (!signal || signal.pulses !== pulses) { signal = { pulses, results: decodeSignal(pulses) }; filled = ""; }
      const r = signal.results;
      note(timeline, !r.length
        ? `<span style="color:${color.RED}">Can't read this signal</span> <span style="color:${color.GREY}">(${pulses.length} pulses)</span>`
        : r.length > 1
          ? `Could be <b>${r.map((x) => `${x.enc.name} ${esc(x.code)}`).join("</b> or <b>")}</b> · <span style="color:${color.GREY}">listen to tell</span>`
          : `<span style="color:${color.GREEN}">CODE</span> <b>${esc(r[0].code)}</b> · ${r[0].enc.name}`, "after");
    }
    if (!signal || signal.results.length !== 1) return;
    const { enc, code } = signal.results[0];

    for (const opt of document.querySelectorAll(".encoding-option")) {
      const head = opt.querySelector(".option-header") || opt;
      if (enc.option.test(head.textContent || "")) mark(opt, color.GREEN);
    }

    const input = document.querySelector(".code-input");
    if (input && input.value !== code && (input.value === "" || input.value === filled)) {
      // A React input: set the value the way typing does, so the game sees it.
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(input, code);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      filled = code;
    }
  }

  // ---------- drawing ----------
  // Marks are redrawn each pass; only ones that changed touch the page.
  let marks = new Map(), nextMarks = new Map();
  function mark(el, c) { nextMarks.set(el, { c }); }
  function tag(el, text) { (nextMarks.get(el) || {}).tag = text; }
  let notes = [];
  function note(anchor, html, where) { notes.push({ anchor, html, where }); }

  function unmark(el) {
    el.style.outline = ""; el.style.outlineOffset = ""; el.removeAttribute(MARK_ATTR);
    const t = el.querySelector(`:scope > .${NOTE_CLASS}-tag`);
    if (t) t.remove();
  }

  function flush() {
    for (const [el] of marks) if (!nextMarks.has(el)) unmark(el);
    for (const [el, m] of nextMarks) {
      const old = marks.get(el);
      if (old && old.c === m.c && old.tag === m.tag && el.hasAttribute(MARK_ATTR)) continue;
      el.setAttribute(MARK_ATTR, "");
      el.style.outline = `2px solid ${m.c}`;
      el.style.outlineOffset = "-2px";
      let t = el.querySelector(`:scope > .${NOTE_CLASS}-tag`);
      if (m.tag) {
        if (!t) {
          t = document.createElement("span");
          t.className = `${NOTE_CLASS}-tag`;
          t.style.cssText = `margin-left:8px;font-size:11px;color:${color.RED};pointer-events:none`;
          el.appendChild(t);
        }
        t.textContent = m.tag;
      } else if (t) t.remove();
    }
    marks = nextMarks; nextMarks = new Map();

    const keep = new Set();
    for (const n of notes) {
      const parent = n.anchor.parentElement;
      if (!parent) continue;
      let el = n.where === "after" ? n.anchor.nextElementSibling : n.anchor.previousElementSibling;
      if (!el || !el.classList.contains(NOTE_CLASS)) {
        el = document.createElement("div");
        el.className = NOTE_CLASS;
        el.style.cssText = "font:inherit;font-size:12px;letter-spacing:.04em;padding:6px 10px;margin:6px 0;" +
          `border:1px solid ${color.CYAN}55;color:${color.TEXT};background:rgba(0,0,0,.35);pointer-events:none`;
        parent.insertBefore(el, n.where === "after" ? n.anchor.nextSibling : n.anchor);
      }
      window.__cor3.setHTML(el, n.html);
      keep.add(el);
    }
    notes = [];
    for (const el of document.querySelectorAll(`div.${NOTE_CLASS}`)) if (!keep.has(el)) el.remove();
  }

  function clear() {
    for (const el of document.querySelectorAll(`[${MARK_ATTR}]`)) unmark(el);
    for (const el of document.querySelectorAll(`.${NOTE_CLASS}`)) el.remove();
    marks = new Map(); nextMarks = new Map(); notes = [];
  }

  function tick() {
    if (!state.enabled) return;
    logStep();
    signalStep();
    flush();
  }

  // ---------- on/off ----------
  window.__cor3.helper("dailyops", () => state.enabled, (on) => {
    state.enabled = on;
    save(STORE_KEY, state);
    if (!on) clear(); else tick();
  });
  window.__cor3DailyOps = { checkLine, decodeSignal, errorButtonIndexes };

  window.__cor3.every(300, tick, "COR3 daily ops");
})();
