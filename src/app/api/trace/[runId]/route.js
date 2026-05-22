import { getRun } from "@/lib/runs";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const run = getRun(params.runId);
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  return Response.json(run);
}
