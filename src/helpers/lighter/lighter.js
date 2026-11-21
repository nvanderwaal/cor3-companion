// COR3 Lite mode (was "Lighter screen"; the id and saved setting stay "lighter").
// Makes the game lighter to run, above all with the browser's hardware
// acceleration off, when the computer's processor has to draw every frame:
//  - hides and pauses the moving background videos and the network map fog;
//  - turns frosted-glass panels (backdrop-filter blur) into solid ones;
//  - stops decoration that animates forever (glitch, flicker, scanlines, glows),
//    but never in the minigames, and never animations that end by themselves
//    (progress bars, windows opening), so the game never waits on one.
// Off until you switch it on with Alt+V or a menu. When the browser draws
// without the graphics card, the top bar offers it once. Only changes what you
// see; it never sends anything to the game. Switching off puts it all back.
(() => {
  "use strict";

  const STORE_KEY = "cor3-lighter-screen";
  // hinted: the no-graphics-acceleration hint was answered (or Lite mode was used).
  const state = window.__cor3.load(STORE_KEY, { enabled: false, hinted: false });
  const save = () => window.__cor3.save(STORE_KEY, state);

  const VIDEOS = '#video-glitch, #video-waves, #app-background video, video[src*="/video/network-map/fog"]';
  const BASE_CSS = `
    #app-background, #glitch-background, #video-glitch, #video-waves,
    video[src*="/video/network-map/fog"] { display: none !important; }
    [data-cor3-lite-glass] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  `;
  // Minigames whose motion is the game (Signal Decode's pulses, the boards).
  // Endless animations in, or around, these are never touched.
  const KEEP = [
    'svg[data-component-name="WallBoard"]',
    '[data-component-name="ConfigHackApplication"]', '[data-sentry-component="ConfigHackApplication"]',
    ".pulse-timeline", ".log-entries", ".analysis-container", ".encoding-option",
  ].join(", ");
  const OURS = '[id^="cor3-"], [class*="cor3-"], [id^="iwb-"]';

  let style = null;

  // ---------- frosted glass ----------
  // The game's style rules with a backdrop blur get a matching rule in our
  // style sheet that turns the blur off and makes a see-through background
  // nearly solid, so text on it stays readable. Rules are read once per
  // style sheet, again only when a sheet gains rules.
  const glassRules = new Map(); // selector -> css
  const seenRules = new WeakMap(); // sheet -> rule count read
  function solid(color) {
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(color || "");
    if (!m) return "";
    let a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a >= 0.9) return "";
    // Fully clear panels get the game's dark ink; others keep their colour.
    const [r, g, b] = a < 0.05 ? [8, 14, 18] : [m[1], m[2], m[3]];
    return `background-color: rgba(${r}, ${g}, ${b}, 0.94) !important;`;
  }
  function readRules(rules) {
    for (const rule of rules) {
      if (rule.cssRules && !rule.selectorText) { readRules(rule.cssRules); continue; } // @media, @supports, @layer
      const s = rule.style;
      if (!s || !rule.selectorText) continue;
      const blur = s.getPropertyValue("backdrop-filter") || s.getPropertyValue("-webkit-backdrop-filter");
      if (!blur || blur === "none" || glassRules.has(rule.selectorText)) continue;
      glassRules.set(rule.selectorText,
        `backdrop-filter: none !important; -webkit-backdrop-filter: none !important; ${solid(s.backgroundColor)}`);
    }
  }
  function scanSheets() {
    const before = glassRules.size;
    for (const sheet of document.styleSheets) {
      if (sheet.ownerNode === style) continue;
      let rules;
      try { rules = sheet.cssRules; } catch (_) { continue; } // another site's sheet
      if (!rules || seenRules.get(sheet) === rules.length) continue;
      seenRules.set(sheet, rules.length);
      readRules(rules);
    }
    // Inline backdrop blurs, which no style rule can reach.
    for (const el of document.querySelectorAll('[style*="backdrop-filter"]:not([data-cor3-lite-glass])')) {
      el.setAttribute("data-cor3-lite-glass", "");
    }
    return glassRules.size !== before;
  }
  function writeStyle() {
    let css = BASE_CSS;
    for (const [sel, rule] of glassRules) css += `\n${sel} { ${rule} }`;
    if (style.textContent !== css) style.textContent = css;
  }

  // ---------- endless animations ----------
  const stopped = new Set();
  function stopLoops() {
    let anims;
    try { anims = document.getAnimations(); } catch (_) { return; }
    for (const a of anims) {
      if (a.playState !== "running" || (window.CSSTransition && a instanceof CSSTransition)) continue;
      const fx = a.effect, el = fx && fx.target;
      if (!el || !el.closest || fx.getTiming().iterations !== Infinity) continue;
      if (el.closest(KEEP) || el.querySelector(KEEP) || el.closest(OURS)) continue;
      try { a.cancel(); stopped.add(a); } catch (_) {}
    }
  }
  function restartLoops() {
    for (const a of stopped) { try { a.play(); } catch (_) {} }
    stopped.clear();
  }

  // ---------- videos ----------
  function pauseVideos() {
    for (const v of document.querySelectorAll(VIDEOS)) {
      if (!v.paused) { v.pause(); v.dataset.cor3Paused = "1"; }
    }
  }

  function apply() {
    if (state.enabled) {
      if (!style) { style = document.createElement("style"); style.id = "cor3-lite-mode"; }
      if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
      if (scanSheets() || !style.textContent) writeStyle();
      pauseVideos();
      stopLoops();
    } else {
      if (style) style.remove();
      for (const el of document.querySelectorAll("[data-cor3-lite-glass]")) el.removeAttribute("data-cor3-lite-glass");
      for (const v of document.querySelectorAll("video[data-cor3-paused]")) { delete v.dataset.cor3Paused; v.play().catch(() => {}); }
      restartLoops();
    }
  }

  // ---------- no graphics acceleration? ----------
  // The browser names its renderer; a software one (or none at all) means
  // the processor draws everything. Asked once, then the context is dropped.
  function drawsInSoftware() {
    try {
      const gl = document.createElement("canvas").getContext("webgl", { failIfMajorPerformanceCaveat: false });
      if (!gl) return true;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch (_) { return false; }
  }
  const lite = (window.__cor3Lite = {
    // true while the top bar should offer Lite mode.
    suggest: false,
    dismiss() { lite.suggest = false; state.hinted = true; save(); window.__cor3.emit("health"); },
  });
  if (!state.enabled && !state.hinted) lite.suggest = drawsInSoftware();

  window.__cor3.helper("lighter", () => state.enabled, (on) => {
    state.enabled = on;
    if (on && lite.suggest) { lite.suggest = false; window.__cor3.emit("health"); }
    if (on) state.hinted = true;
    save();
    apply();
  });

  // New windows, videos and style sheets come with page changes; a slow
  // check also catches animations restarted without one.
  window.__cor3.onDom(() => { if (state.enabled) apply(); }, 1000);
  window.__cor3.every(5000, () => { if (state.enabled) apply(); }, "lite mode");
  apply();
})();
