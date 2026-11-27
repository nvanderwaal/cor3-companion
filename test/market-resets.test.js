const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const src = readFileSync(join(__dirname, "..", "src/helpers/jobs/jobs.js"), "utf8");

// Loads the job tracker with a stubbed page and returns a packet feeder.
function loadJobs() {
  let feed = null;
  const window = {
    __cor3: {
      esc: (s) => String(s),
      toMs: (v) => (typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v : NaN),
      load: (_, d) => ({ ...d, panel: { ...d.panel, open: false } }),
      saveSoon() {}, shadowHost() {}, setHTML() {}, check() {}, shape() {}, findProps() {},
      onPacket: (fn) => { feed = fn; },
      helper() {}, every() {}, onDom() {}, emit() {}, copyText() {},
      color: {},
    },
  };
  const document = { readyState: "complete", addEventListener() {}, querySelectorAll: () => [], body: null };
  window.window = window;
  vm.runInNewContext(src, { window, document, console }, { filename: "jobs.js" });
  return { feed, jt: window.__cor3JobTracker };
}

const iso = (ms) => new Date(Date.now() + ms).toISOString();
const ev = (action, data) => ({ data: ["market", { event: { name: "market", action }, data }] });

test("each market keeps its own job reset", () => {
  const { feed, jt } = loadJobs();
  feed(ev("get.options", { market: { id: "m1", marketName: "SOYUZ" } }));
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(3600e3) }));
  feed(ev("get.options", { market: { id: "m2", marketName: "HOME" } }));
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(600e3) }));
  const rs = jt.resets();
  assert.deepEqual([...rs.map((r) => r.name)], ["HOME", "SOYUZ"]);
  assert.ok(rs.every((r) => !r.fresh));
});

test("a job list that arrives before the market's info still lands on it", () => {
  const { feed, jt } = loadJobs();
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(600e3) }));
  feed(ev("get.options", { market: { id: "m3", marketName: "USOL" } }));
  assert.equal(jt.resets()[0].name, "USOL");
});

test("a passed reset shows as new jobs, first", () => {
  const { feed, jt } = loadJobs();
  feed(ev("get.options", { market: { id: "a", marketName: "D4RK" } }));
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(600e3) }));
  feed(ev("get.options", { market: { id: "b", marketName: "HOME" } }));
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(-1000) }));
  const rs = jt.resets();
  assert.equal(rs[0].name, "HOME");
  assert.equal(rs[0].fresh, true);
});

test("map servers link to their market by marketId", () => {
  const { feed, jt } = loadJobs();
  feed({ data: ["map", { event: { action: "get.map" }, data: { servers: [
    { id: "s1", serverIp: "10.0.0.9", serverName: "SRM7-M", isAccessible: true, marketId: "m1" },
  ], connections: [] } }] });
  feed(ev("get.options", { market: { id: "m1" } }));
  feed(ev("get.jobs", { jobs: [], nextJobsResetAt: iso(600e3) }));
  const [r] = jt.resets();
  assert.equal(r.name, "SRM7-M"); // no market name yet: falls back to the server's name
  assert.equal(jt.state.servers["10.0.0.9"].marketId, "m1");
});
