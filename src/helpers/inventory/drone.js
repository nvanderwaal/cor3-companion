// Drone parts for the inventory helper.
// The personal drone (Expeditions > Personal drone assembling) is built in
// stages, and each stage takes one set of items or a credit price. This is the
// list of stages that take items, from the community guide's "Wings of Mars"
// page (the game doesn't send it as data we can read). Each stage lists its item
// options; a player hands in one of them.
// window.__cor3Drone.need(name) says how many of an item to keep: per stage, the
// most any one option asks for, added up over the stages.
(() => {
  "use strict";

  const STAGES = [
    { n: 1, name: "Universal crimper", options: [{ "FARLINE Universal Crimper": 1 }] },
    { n: 5, name: "Worker clothing", options: [
      { "Old Abibas beanie": 3, 'CCS "Kaloshi" Utility boots': 3 },
      { "Soylent green bar": 3, "Kosmonavt Energy Bar": 3 },
      { "High-load auxiliary cable": 2 },
    ] },
    { n: 6, name: "Superconductor", options: [
      { "Nergalium-79-B slab": 1 },
      { 'Core tech NIC "Nano" package': 1, "Water vial": 3, "Artificial milk": 3 },
    ] },
    { n: 7, name: "Shielding element", options: [
      { "Californium-252 slab": 1 },
      { "Holocene Holographic cable": 1 },
      { "Scissors (CCS Field Surgeon Kit Mk2)": 3, "Scalpel (CCS Field Surgeon Kit Mk2)": 3,
        'NPO "Platforma" universal straps with backpack connector slot': 2 },
    ] },
    { n: 8, name: "Electronics", options: [
      { "Circuit components": 2 },
      { "CCS Painkiller inhaler": 3, "CCS small oxygen inhaler tank": 3 },
      { "METALIFE medical components": 2 },
    ] },
    { n: 9, name: "Optical sensors", options: [
      { "Holocene Holographic processor": 1, "CCS Hydrogel Burn kit": 3 },
      { "Circuit components": 2, "Holocene Holographic processor": 1 },
    ] },
    { n: 11, name: "Assembly and calibration", options: [
      { 'SPI "Smartwrench" Powered adjustable wrench': 1, "High-load auxiliary cable": 1 },
    ] },
  ];

  // Names compared without case, quotes or punctuation, so small spelling
  // differences between the guide and the game still match.
  const key = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

  // key -> { need, uses: [{ n, name, count }] }
  const parts = new Map();
  for (const st of STAGES) {
    const most = new Map();
    for (const opt of st.options) {
      for (const [item, count] of Object.entries(opt)) {
        const k = key(item);
        most.set(k, Math.max(most.get(k) || 0, count));
      }
    }
    for (const [k, count] of most) {
      const p = parts.get(k) || { need: 0, uses: [] };
      p.need += count;
      p.uses.push({ n: st.n, name: st.name, count });
      parts.set(k, p);
    }
  }

  const pad = (n) => String(n).padStart(2, "0");
  window.__cor3Drone = {
    key,
    part: (name) => parts.get(key(name)) || null,
    // "stage 08 Electronics x2, stage 09 Optical sensors x2"
    detail: (p) => p.uses.map((u) => `stage ${pad(u.n)} ${u.name} x${u.count}`).join(", "),
  };
})();
