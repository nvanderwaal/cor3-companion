// The helpers, in menu order. The one list the toolbar menu, the top bar's
// Helpers menu and the shortcuts are built from: id, name, Alt+key, and the
// line the toolbar menu shows under the name. net: true marks the helpers
// that read the game's data (they're flagged when the game's messages change).
// Loaded in the page (before the helpers) and in the toolbar menu.
globalThis.__cor3Helpers = [
  { id: "icewall", name: "ICE WALL Break", key: "H",
    desc: "Outlines where the target pattern can still fit." },
  { id: "protocol", name: "Protocol solver", key: "P",
    desc: "Best next move in the cleaner-bot protocol minigame." },
  { id: "dailyops", name: "Daily ops", key: "D",
    desc: "Marks the bad log lines and decodes the signal, typing in the code." },
  { id: "jobs", name: "Job tracker", key: "J", net: true,
    desc: "Panel with your taken jobs, to-dos, server access and routes; ✓ or ✗ on market jobs." },
  { id: "loadout", name: "Loadout & market", key: "L", net: true,
    desc: "Shows what programs and hardware do to your setup, and the best upgrade." },
  { id: "expeditions", name: "Expeditions", key: "E", net: true,
    desc: "Exact risk and rewards on choices, and mercenary odds." },
  { id: "inventory", name: "Inventory", key: "I", net: true,
    desc: "Sell price on every item and a border in its rarity colour." },
  { id: "lighter", name: "Lite mode", key: "V",
    desc: "Turns off heavy effects (moving backgrounds, blur, endless animations). For slower computers or no hardware acceleration." },
  { id: "topbar", name: "Top bar", key: "B",
    desc: "Thin strip in the game: jobs ready, next deadline, open decisions, helper switches." },
];
