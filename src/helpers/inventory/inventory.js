// COR3 inventory helper.
// On the game's inventory page: the sell price on every item, a border in the
// item's rarity colour (none for common), and one line with the stash's total value.
// Drone parts (the list in drone.js) get a tag: keep it for a drone stage, or a
// spare you can sell once you have enough. Expedition loot gets the same tag.
// Uses the stash data the game sends when you open the inventory, and the loot
// list it sends when you open an expedition's container (through the websocket
// hook in shared/socket.js). Alt+I or the toolbar menu toggles it.
// Reads only; never sends anything.
(() => {
  "use strict";
  const { findProps, load, save, check, shape, cache } = window.__cor3;

  const drone = window.__cor3Drone;
  const PRICE_CLASS = "cor3-inv-price", DRONE_CLASS = "cor3-inv-drone", SUM_CLASS = "cor3-inv-sum", TOP_ATTR = "data-cor3-inv-top";
  // Border per rarity (the game's `tier`); common items get none.
  const TIER_COLOR = { rare: "#4da3ff", epic: "#b06cff", legendary: "#ffa040", quest: window.__cor3.color.GREEN };
  const tierColor = (it) => TIER_COLOR[String(it.tier || "").toLowerCase()] || null;

  // ---------- on/off ----------
  const STORE_KEY = "cor3-inventory-helper";
  const state = load(STORE_KEY, { enabled: true });
  function clear() {
    for (const el of document.querySelectorAll(`.${PRICE_CLASS}, .${DRONE_CLASS}, .${SUM_CLASS}`)) el.remove();
    for (const el of document.querySelectorAll(`[${TOP_ATTR}]`)) { el.style.outline = ""; el.removeAttribute(TOP_ATTR); }
  }
  window.__cor3.helper("inventory", () => state.enabled, (on) => {
    state.enabled = on;
    save(STORE_KEY, state);
    if (!on) clear(); else run();
  });

  // ---------- stash data ----------
  // The stash reply: { items: [{ id, name, sellPrice, canSell, quantity, ... }], maxCapacity, currentUsage }.
  let stash = null; // { items: Map(id -> item), used, max }
  // Kept for a day, so prices show the moment you open the inventory again;
  // the game's fresh stash replaces it.
  const saved = cache("cor3-cache-stash", 24 * 3600e3);
  if (saved.data && Array.isArray(saved.data.items)) {
    stash = { items: new Map(saved.data.items.map((it) => [String(it.id), it])), used: saved.data.used, max: saved.data.max };
  }
  // Loot in the expedition container you opened last: { name, quantity, ... }.
  let loot = []; // items with a name
  function scan(node, depth) {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (node instanceof Uint8Array || node instanceof Date) return;
    if (Array.isArray(node)) { for (const x of node) scan(x, depth + 1); return; }
    if (Array.isArray(node.containerData)) {
      loot = node.containerData.filter((it) => it && typeof it.name === "string");
      run();
      return;
    }
    if (Array.isArray(node.items) && "maxCapacity" in node) {
      check("inventory", "stash data", !node.items.length ||
        node.items.some((it) => it && it.id != null && "sellPrice" in it), shape(node.items[0]));
      const items = new Map();
      for (const it of node.items) if (it && it.id != null) items.set(String(it.id), it);
      stash = { items, used: node.currentUsage ?? node.items.length, max: node.maxCapacity };
      saved.put({ items: [...items.values()], used: stash.used, max: stash.max });
      run();
      return;
    }
    for (const k in node) {
      const v = node[k];
      if (v && typeof v === "object") scan(v, depth + 1);
    }
  }
  window.__cor3.onPacket(scan);
  window.__cor3Inventory = { get stash() { return stash; } };

  // ---------- page ----------
  // The stash item behind a tile: an `item` prop (or the props themselves)
  // whose id is in the stash.
  function itemOf(el) {
    if (!stash) return null;
    return findProps(el, (p) => {
      for (const c of [p.item, p.stashItem, p]) {
        if (c && typeof c === "object" && c.id != null && stash.items.has(String(c.id))) return stash.items.get(String(c.id));
      }
      return null;
    }, 4);
  }
  // The loot item behind a tile in the opened container: an item prop that is
  // a drone part and is in the loot list (by id, or by name when it has none).
  function lootOf(el) {
    if (!loot.length) return null;
    return findProps(el, (p) => {
      for (const c of [p.item, p.containerItem, p.lootItem, p]) {
        if (!c || typeof c !== "object" || typeof c.name !== "string" || !drone.part(c.name)) continue;
        const hit = loot.find((it) => (c.id != null && it.id != null ? String(it.id) === String(c.id) : drone.key(it.name) === drone.key(c.name)));
        if (hit) return hit;
      }
      return null;
    }, 4);
  }
  const price = (it) => (it.canSell !== false && typeof it.sellPrice === "number" && it.sellPrice > 0 ? it.sellPrice : 0);
  const qty = (it) => (typeof it.quantity === "number" && it.quantity > 1 ? it.quantity : 1);
  const fmt = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}M` : n >= 1e4 ? `${Math.round(n / 100) / 10}k` : n.toLocaleString());

  // ---------- drone parts ----------
  // How many of each drone part the stash holds, by name.
  function haves() {
    const have = new Map();
    if (stash) for (const it of stash.items.values()) {
      const p = drone.part(it.name);
      if (p) have.set(drone.key(it.name), (have.get(drone.key(it.name)) || 0) + qty(it));
    }
    return have;
  }
  // Small tag just above the price (bottom right; the name sits on top), or none.
  function droneTag(el, mark) {
    let tag = el.querySelector(`:scope > .${DRONE_CLASS}`);
    if (!mark) { if (tag) tag.remove(); return; }
    if (!tag) {
      tag = document.createElement("div");
      tag.className = DRONE_CLASS;
      tag.style.cssText = "position:absolute;right:2px;bottom:17px;z-index:2;padding:0 3px;border-radius:3px;" +
        "background:rgba(8,16,22,.85);font:700 10px/14px ui-monospace,Consolas,monospace;white-space:nowrap;pointer-events:auto";
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(tag);
    }
    if (tag.textContent !== mark.text) tag.textContent = mark.text;
    tag.style.color = mark.color;
    tag.title = mark.title;
  }
  // The tag for q of a part when `left` more are still needed. Items don't
  // stack in the game, so the tag counts them: 1/4, 2/4 ... 4/4, then SELL.
  // spareWord: "sell" in the stash, "spare" for loot not yet collected.
  function droneMark(p, q, left, have, spareWord) {
    const keep = Math.max(0, Math.min(q, left));
    const { GREEN, GREY } = window.__cor3.color;
    const n = p.need - left + keep; // this one's place in the count
    const sum = keep === q ? `Drone part ${n} of ${p.need}: keep it.`
      : keep > 0 ? `Keep ${keep} for the drone (up to ${n} of ${p.need}), the other ${q - keep} ${spareWord === "sell" ? "can be sold" : "are spare"}.`
      : spareWord === "sell" ? `Spare: you have all ${p.need} for the drone, so this can be sold.` : `Spare: you already have all ${p.need} for the drone.`;
    const title = `${sum}\nDrone ${drone.detail(p)} (each stage takes one of its options, or credits instead).\n` +
      `You have ${have} in your stash.`;
    if (keep === q) return { text: `${n}/${p.need}`, color: GREEN, title };
    if (keep > 0) return { text: `${n}/${p.need} +${q - keep}`, color: "#ffc966", title };
    return { text: spareWord === "sell" ? "SELL" : "SPARE", color: GREY, title };
  }

  function annotate() {
    // Tiles: the outermost element per stash item, and per loot item.
    const tiles = new Map(), lootTiles = new Map();
    for (const el of document.querySelectorAll("[data-component-name]")) {
      if (el.closest(`.${SUM_CLASS}`)) continue;
      const it = itemOf(el);
      const map = it ? tiles : lootTiles;
      const x = it || lootOf(el);
      if (!x) continue;
      const had = map.get(x);
      if (!had || el.contains(had)) map.set(x, el);
    }
    // A stash tile can sit inside the loot window's tile only by accident; stash wins.
    for (const [x, el] of lootTiles) if ([...tiles.values()].some((t) => t === el || t.contains(el) || el.contains(t))) lootTiles.delete(x);

    const have = haves();
    // Stash: the first copies (in stash order) up to the need are kept, the rest are spare.
    const left = new Map();
    if (stash) for (const it of stash.items.values()) {
      const el = tiles.get(it);
      const p = drone.part(it.name);
      if (!el) continue;
      if (!p) { droneTag(el, null); continue; }
      const k = drone.key(it.name);
      const l = left.has(k) ? left.get(k) : p.need;
      droneTag(el, droneMark(p, qty(it), l, have.get(k) || 0, "sell"));
      left.set(k, l - qty(it));
    }
    // Loot: what's still needed after what the stash already holds, shared
    // over the loot tiles in the container's order.
    const lootLeft = new Map();
    for (const it of loot) {
      const el = lootTiles.get(it);
      if (!el) continue;
      const p = drone.part(it.name), k = drone.key(it.name);
      const l = lootLeft.has(k) ? lootLeft.get(k) : p.need - (have.get(k) || 0);
      droneTag(el, droneMark(p, qty(it), l, have.get(k) || 0, "spare"));
      lootLeft.set(k, l - qty(it));
    }
    if (!tiles.size) return;

    for (const [it, el] of tiles) {
      const p = price(it);
      let tag = el.querySelector(`:scope > .${PRICE_CLASS}`);
      if (!p) { if (tag) tag.remove(); } else {
        if (!tag) {
          tag = document.createElement("div");
          tag.className = PRICE_CLASS;
          tag.style.cssText = "position:absolute;right:2px;bottom:2px;z-index:2;padding:0 3px;border-radius:3px;" +
            "background:rgba(8,16,22,.85);font:700 10px/14px ui-monospace,Consolas,monospace;pointer-events:none";
          if (getComputedStyle(el).position === "static") el.style.position = "relative";
          el.appendChild(tag);
        }
        const text = `${fmt(p)} cr`;
        if (tag.textContent !== text) tag.textContent = text;
        tag.style.color = tierColor(it) || window.__cor3.color.TEXT;
        tag.title = qty(it) > 1 ? `sells for ${p.toLocaleString()} each, ${(p * qty(it)).toLocaleString()} for all ${qty(it)}` : `sells for ${p.toLocaleString()}`;
      }
      const color = tierColor(it);
      if (color) {
        if (el.getAttribute(TOP_ATTR) !== color) { el.setAttribute(TOP_ATTR, color); el.style.outline = `2px solid ${color}`; el.style.outlineOffset = "-2px"; }
      } else if (el.hasAttribute(TOP_ATTR)) { el.removeAttribute(TOP_ATTR); el.style.outline = ""; }
    }

    // One line above the items: total value and space.
    const els = [...tiles.values()];
    let grid = els[0].parentElement;
    while (grid && !els.every((e) => grid.contains(e))) grid = grid.parentElement;
    if (!grid || !grid.parentElement) return;
    let sum = grid.parentElement.querySelector(`:scope > .${SUM_CLASS}`);
    if (!sum) {
      sum = document.createElement("div");
      sum.className = SUM_CLASS;
      sum.style.cssText = "margin:0 0 6px;font:11px/1.4 ui-monospace,Consolas,monospace;color:#cfe7ee";
      grid.parentElement.insertBefore(sum, grid);
    }
    const total = [...stash.items.values()].reduce((s, it) => s + price(it) * qty(it), 0);
    const text = `Stash value ${total.toLocaleString()} cr` + (stash.max ? ` \u00b7 ${stash.used}/${stash.max} slots` : "");
    if (sum.textContent !== text) sum.textContent = text;
  }

  function run() {
    if (!state.enabled) return;
    try { annotate(); } catch (e) { console.warn("[inventory helper]", e); }
  }
  // Follows the game's page when tiles appear or change, at most a few times
  // a second, since it looks at every game component.
  window.__cor3.onDom(run, 300);
})();
