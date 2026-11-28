const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const root = join(__dirname, "..");
const src = readFileSync(join(root, "src/helpers/jobs/jobs.js"), "utf8");

function loadJobs(decryptPower) {
  let onPacket = null;
  const noop = () => {};
  const window = {
    __cor3: {
      esc: String,
      toMs: () => NaN,
      load: (key, fallback) => fallback,
      saveSoon: noop,
      shadowHost: noop,
      setHTML: noop,
      check: noop,
      shape: noop,
      findProps: noop,
      onPacket: (fn) => { onPacket = fn; },
      emit: noop,
      helper: noop,
      every: noop,
      onDom: noop,
      copyText: noop,
      color: {},
    },
    __cor3Loadout: {
      state: {
        loadout: {
          at: 1,
          resources: { softwarePower: [{ moduleId: "sw1", abilities: [{ type: "DECRYPT", computedPower: decryptPower }] }] },
          equippedSoftware: [{ id: "sw1", name: "Decryptor", specs: [{ type: "DECRYPT" }] }],
          ownedSoftware: [],
        },
      },
    },
    addEventListener: noop,
    innerWidth: 1280,
  };
  window.window = window;
  const document = {
    readyState: "loading",
    body: null,
    documentElement: { contains: () => false },
    addEventListener: noop,
    querySelectorAll: () => [],
    getElementById: () => null,
  };
  vm.runInNewContext(src, { window, document, console }, { filename: "jobs.js" });
  return { tracker: window.__cor3JobTracker, onPacket };
}

function fileAnalysis(name, cryptRate, decryptPower) {
  return {
    event: { name: "desktop", action: "get.file.analysis" },
    data: { fileId: `id-${name}`, name, type: "eb52x", isEncrypted: true, cryptRate, decryptPower,
      canDecrypt: decryptPower >= cryptRate, canSell: false },
  };
}

const decryptJob = (fileName) => ({
  id: "j1",
  status: "TAKEN",
  conditions: { items: [{ type: "DecryptFile", details: { fileName } }] },
});

test("a file's crypt rate above your DECRYPT power is not decryptable", () => {
  const { tracker, onPacket } = loadJobs(24);
  onPacket(fileAnalysis("export_5289.eb52x", 29, 24));
  const [file] = tracker.decryptFiles(decryptJob("export_5289.eb52x"));
  assert.equal(file.need, 29);
  const check = tracker.decryptCheck(file);
  assert.equal(check.ok, false);
  assert.equal(check.text, "DECRYPT 24/29 &#10007;");
});

test("a file's crypt rate below your DECRYPT power is decryptable", () => {
  const { tracker, onPacket } = loadJobs(24);
  onPacket(fileAnalysis("notes_1200.eb52x", 20, 24));
  const [file] = tracker.decryptFiles(decryptJob("notes_1200.eb52x"));
  assert.equal(file.need, 20);
  const check = tracker.decryptCheck(file);
  assert.equal(check.ok, true);
  assert.equal(check.text, "DECRYPT 24/20 &#10003;");
});
