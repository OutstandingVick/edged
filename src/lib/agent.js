import { getMarketsWithPrices, kellyBet } from "@/lib/polymarket";
import { sendUSDC } from "@/lib/circle";

export async function runAgent({ bankroll, minEdge, baseUrl, source = "manual" } = {}) {
  const resolvedBankroll = Number(bankroll || process.env.BANKROLL || 100);
  const resolvedMinEdge = Number(minEdge || process.env.MIN_EDGE || 0.05);
  const runId = `run_${Date.now()}`;
  const log = [];
  const paperTrading = process.env.PAPER_TRADING !== "false";
  const maxLiveTradeUsdc = Number(process.env.CIRCLE_MAX_LIVE_TRADE_USDC || 1);
  let liveTradeSent = false;

  try {
    log.push(source === "watch" ? "Watch mode woke up and started a market scan." : "Fetching live markets from Polymarket...");
    const markets = await getMarketsWithPrices(8);
    log.push(`Found ${markets.length} active markets with prices.`);

    const results = [];
    const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const market of markets) {
      log.push(`Analyzing: "${market.question?.slice(0, 50)}..."`);

      const res = await fetch(`${origin}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market }),
      });

      const analysis = res.ok ? await res.json() : null;
      if (!analysis || analysis.error) {
        log.push("  ✗ Analysis failed, skipping.");
        continue;
      }

      const hasEdge = Math.abs(analysis.edge || 0) >= resolvedMinEdge && analysis.recommendation !== "PASS";
      const sizing = hasEdge ? kellyBet(analysis.probability, market.yesPrice, resolvedBankroll) : null;

      let trade = null;
      if (sizing) {
        if (paperTrading) {
          trade = {
            paper: true,
            orderId: `paper_${Date.now().toString(36)}`,
            side: sizing.side,
            size: sizing.betSize,
            executedAt: new Date().toISOString(),
          };
          log.push(`  ✓ PAPER TRADE: ${sizing.side} $${sizing.betSize} USDC (edge: ${sizing.edgePct})`);
        } else if (liveTradeSent) {
          trade = {
            paper: false,
            skipped: true,
            reason: "Live execution already completed for this run",
            side: sizing.side,
            size: 0,
            executedAt: new Date().toISOString(),
          };
          log.push("  — LIVE SKIP: one Arc transfer already sent this run");
        } else {
          try {
            const liveAmount = Math.min(sizing.betSize, maxLiveTradeUsdc);
            const tx = await sendUSDC({
              walletId: process.env.CIRCLE_WALLET_ID,
              destinationAddress: process.env.CIRCLE_ESCROW_ADDRESS,
              amount: liveAmount,
            });
            liveTradeSent = true;

            trade = {
              paper: false,
              txId: tx?.id,
              txHash: tx?.txHash,
              side: sizing.side,
              size: liveAmount,
              executedAt: new Date().toISOString(),
            };
            log.push(`  ✓ LIVE ARC TRANSFER: ${sizing.side} $${liveAmount} USDC (edge: ${sizing.edgePct})`);
          } catch (err) {
            trade = {
              paper: false,
              failed: true,
              error: err.message,
              side: sizing.side,
              size: sizing.betSize,
              executedAt: new Date().toISOString(),
            };
            log.push(`  ✗ LIVE EXECUTION FAILED: ${err.message}`);
          }
        }
      } else {
        log.push("  — PASS: insufficient edge");
      }

      results.push({ market, analysis, sizing, trade, hasEdge });
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    results.sort((a, b) => Math.abs(b.analysis?.edge || 0) - Math.abs(a.analysis?.edge || 0));

    const trades = results.filter((result) => result.trade && !result.trade.failed && !result.trade.skipped);
    log.push(`Scan complete. ${trades.length} trades executed.`);

    return {
      runId,
      source,
      completedAt: new Date().toISOString(),
      marketsScanned: markets.length,
      tradesExecuted: trades.length,
      opportunitiesFound: results.filter((result) => result.hasEdge).length,
      totalDeployed: trades.reduce((sum, result) => sum + (result.trade?.size || result.sizing?.betSize || 0), 0),
      results,
      log,
    };
  } catch (err) {
    log.push(`✗ Fatal error: ${err.message}`);
    return {
      runId,
      source,
      completedAt: new Date().toISOString(),
      error: err.message,
      log,
      results: [],
      marketsScanned: 0,
      tradesExecuted: 0,
      opportunitiesFound: 0,
      totalDeployed: 0,
    };
  }
}
