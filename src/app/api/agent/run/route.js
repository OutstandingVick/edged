import { runAgent } from "@/lib/agent";
import { addRun } from "@/lib/runs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const run = await runAgent({
    bankroll: body.bankroll,
    minEdge: body.minEdge,
    baseUrl: req.nextUrl?.origin,
    source: body.source || "manual",
  });

  addRun(run);

  return Response.json(run, { status: run.error ? 500 : 200 });
}
