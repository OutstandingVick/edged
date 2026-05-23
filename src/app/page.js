"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEMO = [
  {
    market: { question: "Will the Fed cut rates in June 2026?", yesPrice: 0.34, volume24hr: 284000 },
    analysis: {
      probability: 0.52,
      confidence: "medium",
      edge: 0.18,
      recommendation: "BET_YES",
      keyInsight: "Market underweights recent CPI softening. Fed has signaled openness to cuts if inflation holds below 2.8%.",
      reasoningTrace:
        "Base rate for Fed cuts in low-inflation environments is around 55%. Current core CPI at 2.7% gives the Fed cover. Market appears anchored to the previous hawkish stance without updating for recent data.",
    },
    sizing: { side: "YES", edgePct: "18.0%", betSize: 4.5 },
    trade: { paper: true, orderId: "paper_abc123" },
    hasEdge: true,
  },
  {
    market: { question: "Will Bitcoin reach $120K before July 2026?", yesPrice: 0.61, volume24hr: 1240000 },
    analysis: {
      probability: 0.44,
      confidence: "medium",
      edge: -0.17,
      recommendation: "BET_NO",
      keyInsight: "Market overweights ETF inflows. High funding rates on perps signal crowded longs.",
      reasoningTrace:
        "BTC needs roughly 20% upside in about six weeks. Historically that happens in fewer than 35% of comparable setups. ETF inflows have weakened while derivatives positioning remains crowded.",
    },
    sizing: { side: "NO", edgePct: "17.0%", betSize: 3.8 },
    trade: { paper: true, orderId: "paper_def456" },
    hasEdge: true,
  },
  {
    market: { question: "Will ETH ETF net inflows exceed $1B in May 2026?", yesPrice: 0.48, volume24hr: 92000 },
    analysis: {
      probability: 0.51,
      confidence: "low",
      edge: 0.03,
      recommendation: "PASS",
      keyInsight: "Market is close to fair value. Edge is below the agent threshold.",
      reasoningTrace:
        "Current ETH ETF flows are tracking below the target pace. Reaching $1B requires acceleration, but there is no strong evidence that the market is materially mispriced.",
    },
    sizing: null,
    trade: null,
    hasEdge: false,
  },
];

function compactAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatUsd(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getUsdcBalance(data) {
  const erc20 = data?.balances?.find((b) => b.token?.symbol === "USDC" && b.token?.standard === "ERC20");
  const native = data?.balances?.find((b) => b.token?.symbol === "USDC");
  return erc20?.amount || native?.amount || "0";
}

function ShellButton({ children, active, disabled, onClick, variant = "primary" }) {
  return (
    <button className={`shellButton ${variant} ${active ? "active" : ""}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function WalletPanel({ data }) {
  if (data?.error) {
    return (
      <section className="walletPanel danger">
        <div>
          <p className="eyebrow">Circle Wallet</p>
          <h2>Setup Needs Attention</h2>
          <p>{data.message || data.error}</p>
        </div>
        <span className="statusPill danger">Blocked</span>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="walletPanel loading">
        <div>
          <p className="eyebrow">Circle Wallet</p>
          <h2>Loading Arc Wallet</h2>
          <p>Checking the agent treasury and settlement rail.</p>
        </div>
        <span className="statusPill">Syncing</span>
      </section>
    );
  }

  const balance = getUsdcBalance(data);
  const address = data.wallet?.address || "";
  const mode = data.liveMode ? "Live Mode" : "Paper Mode";

  return (
    <section className="walletPanel">
      <div className="walletIdentity">
        <p className="eyebrow">Settlement Rail</p>
        <h2>Arc Testnet Treasury</h2>
        <p className="addressLine">{compactAddress(address)}</p>
        {data.escrowAddress && <p className="addressLine">Escrow {compactAddress(data.escrowAddress)}</p>}
      </div>
      <div className="walletStats">
        <div>
          <span>USDC</span>
          <strong>{formatUsd(balance)}</strong>
        </div>
        <div>
          <span>State</span>
          <strong>{data.wallet?.state || "Pending"}</strong>
        </div>
      </div>
      <span className={`statusPill ${data.liveMode ? "live" : ""}`}>{mode}</span>
    </section>
  );
}

function MetricStrip({ stats, deployed, walletData }) {
  const balance = Number(getUsdcBalance(walletData));
  const metrics = [
    ["Treasury", formatUsd(balance || 100), "Circle funded"],
    ["Committed", formatUsd(deployed), "Kelly sized"],
    ["Markets", stats.scanned, "live scan"],
    ["Edges", stats.edge, "above filter"],
    ["Actions", stats.trades, "orders or transfers"],
  ];

  return (
    <section className="metricStrip">
      {metrics.map(([label, value, hint]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{hint}</small>
        </div>
      ))}
    </section>
  );
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DecisionRail({ items, running }) {
  const best = items.find((item) => item.hasEdge && item.sizing) || items[0];
  const recommendation = best?.analysis?.recommendation || "WAITING";
  const edge = best?.sizing?.edgePct || "0.0%";
  const side = best?.sizing?.side || "PASS";

  return (
    <section className="decisionRail">
      <div>
        <p className="eyebrow">Current Decision</p>
        <h1>{running ? "Scanning live markets" : recommendation.replace("_", " ")}</h1>
        <p>{best?.analysis?.keyInsight || "Run the agent to surface a live thesis."}</p>
      </div>
      <div className="decisionDial">
        <span>Edge</span>
        <strong>{edge}</strong>
        <small>{side}</small>
      </div>
    </section>
  );
}

function ProofPanel({ lastAction, walletData }) {
  const live = walletData?.liveMode;
  const escrow = walletData?.escrowAddress;

  return (
    <section className="proofPanel">
      <div>
        <p className="eyebrow">Proof of Action</p>
        <h2>{lastAction ? "Agent executed an Arc action" : live ? "Live execution armed" : "Paper execution active"}</h2>
        <p>
          {lastAction
            ? `Latest action moved ${formatUsd(lastAction.size)} USDC for a ${lastAction.side} thesis.`
            : live
              ? "The next qualified edge will create a capped Circle transfer on Arc Testnet."
              : "Switch PAPER_TRADING=false to send capped Arc Testnet USDC transfers."}
        </p>
      </div>
      <div className="proofGrid">
        <div>
          <span>Destination</span>
          <strong>{compactAddress(escrow)}</strong>
        </div>
        <div>
          <span>Execution</span>
          <strong>{lastAction ? "Circle transfer" : live ? "Armed" : "Paper"}</strong>
        </div>
        <div>
          <span>Amount</span>
          <strong>{lastAction ? `${formatUsd(lastAction.size)} USDC` : "1 USDC cap"}</strong>
        </div>
      </div>
    </section>
  );
}

function WatchPanel({ watch, runs }) {
  const latest = runs?.[0];
  return (
    <section className="watchPanel">
      <div>
        <p className="eyebrow">Autonomous Watch Mode</p>
        <h2>{watch?.active ? "Edged is watching markets" : "Watch mode is paused"}</h2>
        <p>
          {watch?.active
            ? `Last scan ${formatTime(watch.lastRunAt)}. Next scan ${formatTime(watch.nextRunAt)}.`
            : "Start watch mode to let Edged scan on a timer and record traceable autonomous runs."}
        </p>
      </div>
      <div className="watchStats">
        <div>
          <span>Recent runs</span>
          <strong>{runs?.length || 0}</strong>
        </div>
        <div>
          <span>Latest source</span>
          <strong>{latest?.source || "—"}</strong>
        </div>
      </div>
    </section>
  );
}

function RunHistory({ runs }) {
  if (!runs?.length) return null;

  return (
    <section className="historyPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Run History</p>
          <h2>Traceable Agent Runs</h2>
        </div>
        <span>{runs.length} stored</span>
      </div>
      <div className="historyGrid">
        {runs.slice(0, 6).map((run) => (
          <a className="historyCard" href={`/api/trace/${run.runId}`} key={run.runId} target="_blank">
            <span>{run.source || "manual"}</span>
            <strong>{run.tradesExecuted} actions · {run.opportunitiesFound} edges</strong>
            <small>{formatTime(run.completedAt)} · {run.runId}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function MarketCard({ item }) {
  const [open, setOpen] = useState(false);
  const { market, analysis, sizing, trade, hasEdge } = item;
  const isNo = analysis.recommendation === "BET_NO";
  const accent = hasEdge ? (isNo ? "no" : "yes") : "pass";
  const marketPct = Math.round((market.yesPrice || 0) * 100);
  const agentPct = Math.round((analysis.probability || 0) * 100);

  return (
    <article className={`marketCard ${accent}`} onClick={() => setOpen((v) => !v)}>
      <div className="marketTopline">
        <div>
          <div className="tagRow">
            <span className="tag primary">{analysis.recommendation}</span>
            <span className="tag">{analysis.confidence} confidence</span>
            {analysis.fallback && <span className="tag warning">AI fallback</span>}
            {trade && <span className="tag actioned">{trade.paper ? "Paper action" : "Arc transfer"}</span>}
          </div>
          <h3>{market.question}</h3>
        </div>
        <div className="edgeBlock">
          <strong>{sizing?.edgePct || "Fair"}</strong>
          <span>{sizing?.side || "PASS"}</span>
        </div>
      </div>

      <div className="probabilityBand" aria-label="Market price and agent probability">
        <div className="bandLabels">
          <span>Market {marketPct}%</span>
          <span>Agent {agentPct}%</span>
        </div>
        <div className="bandTrack">
          <div className="marketFill" style={{ width: `${marketPct}%` }} />
          <div className="agentPin" style={{ left: `${agentPct}%` }} />
        </div>
      </div>

      <p className="insight">{analysis.keyInsight}</p>

      {open && (
        <div className="tracePanel">
          <p className="eyebrow">Public Reasoning Trace</p>
          <p>{analysis.reasoningTrace}</p>
          <div className="tradeGrid">
            <div>
              <span>Kelly Size</span>
              <strong>{sizing ? `${formatUsd(sizing.betSize)} USDC` : "None"}</strong>
            </div>
            <div>
              <span>Execution</span>
              <strong>{trade ? (trade.paper ? "Paper" : "Arc") : "Skipped"}</strong>
            </div>
            <div>
              <span>Volume 24h</span>
              <strong>{formatUsd(market.volume24hr)}</strong>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function AgentLog({ log, logRef }) {
  return (
    <aside className="logPanel">
      <div className="panelHeader">
        <p className="eyebrow">Audit Log</p>
        <span>{log.length} events</span>
      </div>
      <div className="logStream" ref={logRef}>
        {log.map((line, index) => (
          <p className={line.includes("FAILED") || line.startsWith("✗") ? "bad" : line.includes("TRADE") || line.includes("TRANSFER") ? "good" : ""} key={`${line}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {line.replace("✓", "").replace("✗", "")}
          </p>
        ))}
      </div>
    </aside>
  );
}

export default function Home() {
  const [items, setItems] = useState(DEMO);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ scanned: "—", trades: "—", edge: "—" });
  const [log, setLog] = useState(["Ready. Run the agent to scan live markets."]);
  const [error, setError] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [watch, setWatch] = useState(null);
  const [runs, setRuns] = useState([]);
  const [watchBusy, setWatchBusy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("edged-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("edged-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => setWalletData(ok ? data : { ...data, error: data.error || "Wallet request failed" }))
      .catch((err) => setWalletData({ error: err.message, message: "Could not reach /api/wallet." }));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  async function refreshHistory() {
    const res = await fetch("/api/agent/history");
    const data = await res.json();
    setRuns(data.runs || []);
    setWatch(data.watch || null);
  }

  useEffect(() => {
    refreshHistory().catch(() => {});
  }, []);

  function applyRun(data) {
    setItems(data.results || []);
    setLastAction((data.results || []).find((item) => item.trade && !item.trade.paper && !item.trade.failed && !item.trade.skipped)?.trade || null);
    setStats({ scanned: data.marketsScanned, trades: data.tradesExecuted, edge: data.opportunitiesFound });
    setLog(data.log || ["Scan complete."]);
  }

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setLog(["Starting autonomous market scan."]);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankroll: 100, minEdge: 0.05 }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      applyRun(data);
      refreshHistory().catch(() => {});
    } catch (err) {
      setError(err.message);
      setLog((prev) => [...prev, `FAILED: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }

  async function toggleWatch() {
    if (watchBusy) return;
    setWatchBusy(true);
    setError(null);
    try {
      const activate = !watch?.active;
      const res = await fetch("/api/agent/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: activate, runNow: activate, bankroll: 100, minEdge: 0.05 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setWatch(data.watch || null);
      if (data.run) applyRun(data.run);
      await refreshHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setWatchBusy(false);
    }
  }

  useEffect(() => {
    if (!watch?.active) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/agent/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true, bankroll: 100, minEdge: 0.05 }),
        });
        const data = await res.json();
        setWatch(data.watch || null);
        if (data.run) applyRun(data.run);
        await refreshHistory();
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, [watch?.active]);

  const deployed = useMemo(
    () => items.filter((item) => item.trade && !item.trade.failed && !item.trade.skipped).reduce((sum, item) => sum + (item.trade?.size || item.sizing?.betSize || 0), 0),
    [items]
  );

  return (
    <main className="appShell">
      <nav className="topNav">
        <div className="brandMark">
          <img src="/edged-mark.svg" alt="" />
          Edged
        </div>
        <div className="navLinks">
          <span>Markets</span>
          <span>Wallets</span>
          <span>Arc</span>
        </div>
      </nav>

      <section className="heroBar">
        <div>
          <p className="eyebrow">Circle Agent Stack × Arc Testnet</p>
          <h1>Financial intelligence for prediction markets.</h1>
          <p>
            Edged scans live Polymarket order books, estimates fair odds, explains its thesis,
            sizes exposure with Kelly, and settles test USDC through Circle developer-controlled wallets.
          </p>
        </div>
        <div className="heroActions">
          <ShellButton variant="secondary" active={watch?.active} disabled={watchBusy || running} onClick={toggleWatch}>
            {watch?.active ? "Stop watch" : watchBusy ? "Starting" : "Watch mode"}
          </ShellButton>
          <ShellButton disabled={running} onClick={run}>
            {running ? "Scanning" : "Run agent"}
          </ShellButton>
        </div>
      </section>

      <WalletPanel data={walletData} />
      <MetricStrip stats={stats} deployed={deployed} walletData={walletData} />
      <DecisionRail items={items} running={running} />
      <ProofPanel lastAction={lastAction} walletData={walletData} />
      <WatchPanel watch={watch} runs={runs} />
      <RunHistory runs={runs} />

      {error && <div className="errorBanner">{error}</div>}

      <section className="workbench">
        <div className="marketColumn">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Opportunity Book</p>
              <h2>{items.length} Markets Under Review</h2>
            </div>
            <span>Click any thesis</span>
          </div>
          {items.map((item, index) => (
            <MarketCard item={item} key={`${item.market.question}-${index}`} />
          ))}
        </div>
        <AgentLog log={log} logRef={logRef} />
      </section>

      <footer className="footerLine">
        <div>
          <span>Polymarket intelligence</span>
          <span>Circle developer-controlled wallet</span>
          <span>Arc Testnet settlement</span>
        </div>
        <button
          className="themeToggle"
          type="button"
          aria-pressed={darkMode}
          onClick={() => setDarkMode((value) => !value)}
        >
          <span>{darkMode ? "Dark" : "Light"}</span>
          <strong>{darkMode ? "Switch to light" : "Switch to dark"}</strong>
        </button>
      </footer>
    </main>
  );
}
