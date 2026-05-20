"use client";
import { useState, useRef, useEffect } from "react";

const G = {
  bg: "#080c10", surface: "#0d1219", border: "#1a2535",
  green: "#00e5a0", red: "#ff4d6a", yellow: "#f5c518", blue: "#4d9fff",
  text: "#c8d8e8", dim: "#4a6a8a", bright: "#e8f4ff",
};

const DEMO = [
  {
    market: { question: "Will the Fed cut rates in June 2026?", yesPrice: 0.34, volume24hr: 284000 },
    analysis: { probability: 0.52, confidence: "medium", edge: 0.18, recommendation: "BET_YES", keyInsight: "Market underweights recent CPI softening. Fed has signaled openness to cuts if inflation holds below 2.8%.", reasoningTrace: "Base rate for Fed cuts in low-inflation environments is ~55%. Current core CPI at 2.7% gives the Fed cover. Market appears anchored to previous hawkish stance without updating for recent data." },
    sizing: { side: "YES", edgePct: "18.0%", betSize: 4.5 },
    trade: { paper: true, orderId: "paper_abc123" }, hasEdge: true,
  },
  {
    market: { question: "Will Bitcoin reach $120K before July 2026?", yesPrice: 0.61, volume24hr: 1240000 },
    analysis: { probability: 0.44, confidence: "medium", edge: -0.17, recommendation: "BET_NO", keyInsight: "Market overweights ETF inflows. High funding rates on perps signal crowded longs.", reasoningTrace: "BTC needs ~20% upside in ~6 weeks. Historically happens in <35% of similar setups. ETF inflows net negative past two weeks. 61% seems overconfident." },
    sizing: { side: "NO", edgePct: "17.0%", betSize: 3.8 },
    trade: { paper: true, orderId: "paper_def456" }, hasEdge: true,
  },
  {
    market: { question: "Will ETH ETF net inflows exceed $1B in May 2026?", yesPrice: 0.48, volume24hr: 92000 },
    analysis: { probability: 0.51, confidence: "low", edge: 0.03, recommendation: "PASS", keyInsight: "Market fairly priced. Edge below threshold.", reasoningTrace: "Current ETH ETF flows tracking ~$800M/month. $1B requires slight acceleration. No strong information asymmetry identified." },
    sizing: null, trade: null, hasEdge: false,
  },
];

function Card({ item, i }) {
  const [open, setOpen] = useState(false);
  const { market, analysis, sizing, trade, hasEdge } = item;
  const isYes = analysis.recommendation === "BET_YES";
  const isNo = analysis.recommendation === "BET_NO";
  const accent = !hasEdge ? G.dim : isYes ? G.green : G.red;

  return (
    <div onClick={() => setExpanded(!open)} style={{ borderLeft: `3px solid ${accent}`, background: G.surface, border: `1px solid ${open ? accent + "50" : G.border}`, borderLeftColor: accent, borderRadius: 6, padding: "14px 16px", marginBottom: 8, cursor: "pointer", animation: "fadeIn 0.3s ease" }}
      onClick={() => setOpen(!open)}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, border: `1px solid ${accent}`, color: accent, background: accent + "15" }}>
              {analysis.recommendation}
            </span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, border: `1px solid ${G.border}`, color: G.dim }}>
              {analysis.confidence} confidence
            </span>
            {trade && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, border: `1px solid ${G.blue}`, color: G.blue, background: G.blue + "15" }}>● EXECUTED</span>}
          </div>
          <div style={{ fontSize: 14, color: G.bright, lineHeight: 1.4, fontWeight: 600 }}>{market.question}</div>
        </div>
        {hasEdge && sizing && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, color: accent, fontWeight: 700 }}>{sizing.edgePct}</div>
            <div style={{ fontSize: 10, color: G.dim }}>edge</div>
          </div>
        )}
      </div>

      {hasEdge && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.dim, marginBottom: 4 }}>
            <span>MARKET {(market.yesPrice * 100).toFixed(0)}%</span>
            <span>AGENT {(analysis.probability * 100).toFixed(0)}%</span>
          </div>
          <div style={{ height: 4, background: G.border, borderRadius: 2, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${market.yesPrice * 100}%`, background: G.blue, borderRadius: 2, opacity: 0.5 }} />
            <div style={{ position: "absolute", top: -3, width: 2, height: 10, background: accent, left: `${analysis.probability * 100}%`, transform: "translateX(-50%)", borderRadius: 1 }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: G.dim, fontStyle: "italic", lineHeight: 1.5 }}>{analysis.keyInsight}</div>

      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: G.dim, letterSpacing: "0.1em", marginBottom: 6 }}>REASONING TRACE</div>
          <div style={{ fontSize: 12, color: G.text, lineHeight: 1.7, background: G.bg, padding: "10px 12px", borderRadius: 4 }}>{analysis.reasoningTrace}</div>
          {sizing && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 }}>
              {[["BET SIZE", `$${sizing.betSize} USDC`], ["SIDE", sizing.side], ["EDGE", sizing.edgePct]].map(([l, v]) => (
                <div key={l} style={{ background: G.bg, padding: "8px 10px", borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: G.dim, letterSpacing: "0.1em" }}>{l}</div>
                  <div style={{ fontSize: 14, color: accent, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {trade && <div style={{ marginTop: 8, fontSize: 10, color: G.dim }}>📋 PAPER · {trade.orderId}</div>}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState(DEMO);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ scanned: "—", trades: "—", edge: "—" });
  const [log, setLog] = useState(["Ready. Click RUN AGENT to start."]);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setLog(["Initiating market scan..."]);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankroll: 100, minEdge: 0.05 }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.results || []);
      setStats({ scanned: data.marketsScanned, trades: data.tradesExecuted, edge: data.opportunitiesFound });
      setLog(data.log || ["Done."]);
    } catch (e) {
      setError(e.message);
      setLog((p) => [...p, `✗ ${e.message}`]);
    } finally {
      setRunning(false);
    }
  }

  const deployed = items.filter((i) => i.trade).reduce((s, i) => s + (i.sizing?.betSize || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: G.bg }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              <span style={{ color: G.green }}>AGENT</span><span style={{ color: G.bright }}>ORACLE</span>
              <span style={{ fontSize: 10, color: G.dim, marginLeft: 10, border: `1px solid ${G.border}`, padding: "2px 6px", borderRadius: 3 }}>PAPER MODE</span>
            </div>
            <div style={{ fontSize: 11, color: G.dim, marginTop: 3 }}>Autonomous AI prediction market trader · Polymarket × Arc × Circle</div>
          </div>
          <button onClick={run} disabled={running} style={{
            background: running ? G.border : G.green, color: running ? G.dim : G.bg,
            border: "none", borderRadius: 4, padding: "10px 18px", fontSize: 12,
            fontFamily: "inherit", fontWeight: 700, cursor: running ? "not-allowed" : "pointer",
            letterSpacing: "0.06em", transition: "all 0.2s",
          }}>
            {running ? "⟳ SCANNING..." : "▶ RUN AGENT"}
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            ["BANKROLL", "$100.00", G.bright],
            ["DEPLOYED", `$${deployed.toFixed(2)}`, G.yellow],
            ["CASH", `$${(100 - deployed).toFixed(2)}`, G.green],
            ["MARKETS", stats.scanned, G.blue],
            ["TRADES", stats.trades, G.green],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: G.dim, letterSpacing: "0.12em" }}>{l}</div>
              <div style={{ fontSize: 18, color: c, fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#ff4d6a15", border: `1px solid ${G.red}`, color: G.red, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}>
            ✗ {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 12 }}>
          {/* Opportunities */}
          <div>
            <div style={{ fontSize: 10, color: G.dim, letterSpacing: "0.12em", marginBottom: 8 }}>
              OPPORTUNITIES · {items.length} markets · click to expand
            </div>
            {items.map((item, i) => <Card key={i} item={item} i={i} />)}
          </div>

          {/* Log */}
          <div>
            <div style={{ fontSize: 10, color: G.dim, letterSpacing: "0.12em", marginBottom: 8 }}>AGENT LOG</div>
            <div ref={logRef} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: 10, height: 320, overflowY: "auto", fontSize: 10, lineHeight: 1.9 }}>
              {log.map((l, i) => (
                <div key={i} style={{ color: l.startsWith("✗") ? G.red : l.startsWith("✓") || l.includes("TRADE") ? G.green : G.dim }}>{l}</div>
              ))}
            </div>

            <div style={{ marginTop: 10, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: G.dim, letterSpacing: "0.12em", marginBottom: 8 }}>HOW IT WORKS</div>
              {[["01", "Scans Polymarket live markets"], ["02", "Gemini estimates true probability"], ["03", "Kelly Criterion sizes each bet"], ["04", "Executes if edge > 5%"], ["05", "Trace published publicly"]].map(([n, t]) => (
                <div key={n} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: G.green, fontWeight: 700 }}>{n}</span>
                  <span style={{ color: G.dim }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, borderTop: `1px solid ${G.border}`, paddingTop: 12, fontSize: 10, color: G.dim, display: "flex", justifyContent: "space-between" }}>
          <span>AgentOracle · Agora Hackathon 2026 · Canteen × Circle × Arc</span>
          <span>Paper trading active</span>
        </div>
      </div>
    </div>
  );
}
