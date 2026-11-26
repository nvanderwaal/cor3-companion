const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const root = join(__dirname, "..");

function loadDailyOps() {
  const window = {
    __cor3: {
      load: () => ({ enabled: false }),
      save() {},
      color: {},
      esc: (s) => s,
      helper() {},
      every() {},
    },
    document: {
      querySelector() {},
      querySelectorAll: () => [],
    },
  };
  window.window = window;
  vm.runInNewContext(
    readFileSync(join(root, "src/helpers/dailyops/dailyops.js"), "utf8"),
    window,
    { filename: "dailyops.js" },
  );
  return window.__cor3DailyOps;
}

const { errorButtonIndexes } = loadDailyOps();

function mark(codes, texts) {
  return [...errorButtonIndexes(codes, texts)];
}

const english = [
  "Time format is incorrect",
  "Event type is incorrect",
  "Missing /sector parameter",
  "Missing /status parameter",
  "/sector parameter is incorrect",
  "/status parameter is incorrect",
];
const translated = ["Zeit", "Typ", "Sektor fehlt", "Status fehlt", "Sektor falsch", "Status falsch"];

test("six buttons follow live order when the labels are not English", () => {
  assert.deepEqual(mark(["TIME", "SECTOR_BAD"], translated), [0, 4]);
  assert.deepEqual(mark(["STATUS_BAD", "TIME"], translated), [0, 5]);
  assert.deepEqual(mark([], translated), []);
});

test("six buttons follow position when the English labels are reversed", () => {
  const reversed = [...english].reverse();
  assert.deepEqual(mark(["TIME"], reversed), [0]);
  assert.deepEqual(mark(["STATUS_BAD"], reversed), [5]);
});

test("any other count matches the English label", () => {
  const five = translated.slice(0, 5);
  assert.deepEqual(mark(["TIME", "SECTOR_BAD"], five), []);
  assert.deepEqual(mark(["TYPE"], ["  Event type is incorrect  ", "Zeit"]), [0]);
  assert.deepEqual(mark(["STATUS_BAD"], [...english].reverse().slice(0, 5)), [0]);
});
