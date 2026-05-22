import { runAgent } from "@/lib/agent";
import { addRun, getWatchState, updateWatchState } from "@/lib/runs";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getNextRunAt(intervalMs) {
  return new Date(Date.now() + intervalMs).toISOString();
}

export async function GET() {
  return Response.json({ watch: getWatchState() });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const current = getWatchState();
  const intervalMs = Number(body.intervalMs || current.intervalMs || 60000);

  if (body.active === false) {
    const watch = updateWatchState({ active: false, nextRunAt: null, intervalMs });
    return Response.json({ watch, run: null });
  }

  const due = !current.nextRunAt || new Date(current.nextRunAt).getTime() <= Date.now();
  const shouldRun = body.runNow || !current.active || due;

  updateWatchState({
    active: true,
    startedAt: current.startedAt || new Date().toISOString(),
    intervalMs,
    nextRunAt: shouldRun ? null : current.nextRunAt,
  });

  let run = null;
  if (shouldRun) {
    run = await runAgent({
      bankroll: body.bankroll,
      minEdge: body.minEdge,
      baseUrl: req.nextUrl?.origin,
      source: "watch",
    });
    addRun(run);
    updateWatchState({
      lastRunAt: run.completedAt,
      nextRunAt: getNextRunAt(intervalMs),
    });
  }

  return Response.json({
    watch: getWatchState(),
    run,
  });
}
