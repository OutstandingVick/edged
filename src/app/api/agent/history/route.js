import { getRuns, getWatchState } from "@/lib/runs";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    runs: getRuns(),
    watch: getWatchState(),
  });
}
