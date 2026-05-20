import { getMarketsWithPrices, kellyBet } from "@/lib/polymarket";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  const { bankroll = 100, minEdge = 0.05 } = await req.json().catch(() => ({}));
  const runId = `run_${Date.now()}`;
  const log = [];

  try {
    log.push("Fetching live markets from Polymarket...");
    const markets = await getMarketsWithPrices(8);
    log.push(`Found ${markets.length} active markets with prices.`);

    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const market of markets) {
      log.push(`Analyzing: "${market.question?.slice(0, 50)}..."`);

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market }),
      });

      const analysis = res.ok ? await res.json() : null;
      if (!analysis || analysis.error) {
        log.push(`  ✗ Analysis failed, skipping.`);
        continue;
      }

      const hasEdge = Math.abs(analysis.edge || 0) >= minEdge && analysis.recommendation !== "PASS";
      const sizing = hasEdge ? kellyBet(analysis.probability, market.yesPrice, bankroll) : null;

      let trade = null;
      if (sizing) {
        // Paper trade — real execution added in Day 3 with Circle Wallets
        trade = {
          paper: true,
          orderId: `paper_${Date.now().toString(36)}`,
          side: sizing.side,
          size: sizing.betSize,
          executedAt: new Date().toISOString(),
        };
        log.push(`  ✓ PAPER TRADE: ${sizing.side} $${sizing.betSize} USDC (edge: ${sizing.edgePct})`);
      } else {
        log.push(`  — PASS: insufficient edge`);
      }

      results.push({ market, analysis, sizing, trade, hasEdge });
      await new Promise((r) => setTimeout(r, 400));
    }

    results.sort((a, b) => Math.abs(b.analysis?.edge || 0) - Math.abs(a.analysis?.edge || 0));

    const trades = results.filter((r) => r.trade);
    log.push(`Scan complete. ${trades.length} trades executed.`);

    return Response.json({
      runId,
      completedAt: new Date().toISOString(),
      marketsScanned: markets.length,
      tradesExecuted: trades.length,
      opportunitiesFound: results.filter((r) => r.hasEdge).length,
      totalDeployed: trades.reduce((s, r) => s + (r.sizing?.betSize || 0), 0),
      results,
      log,
    });
  } catch (err) {
    log.push(`✗ Fatal error: ${err.message}`);
    return Response.json({ error: err.message, log, runId }, { status: 500 });
  }
}
