const STORE_KEY = "__EDGED_RUN_STORE__";

function createStore() {
  return {
    runs: [],
    watch: {
      active: false,
      startedAt: null,
      lastRunAt: null,
      nextRunAt: null,
      intervalMs: Number(process.env.WATCH_INTERVAL_MS || 60000),
    },
  };
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = createStore();
  }
  return globalThis[STORE_KEY];
}

export function addRun(run) {
  const store = getStore();
  store.runs.unshift(run);
  store.runs = store.runs.slice(0, 25);
  return run;
}

export function getRuns() {
  return getStore().runs;
}

export function getRun(runId) {
  return getRuns().find((run) => run.runId === runId) || null;
}

export function getWatchState() {
  return getStore().watch;
}

export function updateWatchState(patch) {
  const store = getStore();
  store.watch = { ...store.watch, ...patch };
  return store.watch;
}
