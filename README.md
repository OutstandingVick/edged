# Edged

Autonomous market intelligence for prediction markets.

Edged scans live Polymarket markets, estimates where public odds may be mispriced, sizes exposure with Kelly Criterion, publishes its reasoning trace, and can execute capped USDC actions through Circle developer-controlled wallets on Arc Testnet.

Built for the Agora Agents Hackathon by [@outstandingvick](https://x.com/outstandingvick) / SuperteamNG.

![Edged logo](public/edged-logo.svg)

## Why It Exists

Prediction markets expose public beliefs, but most traders still need to manually scan markets, reason about fair probabilities, size risk, and act. Edged turns that workflow into an autonomous agent loop:

```text
scan markets -> reason about true odds -> size with Kelly -> act with USDC -> publish trace
```

The key product idea is that the reasoning trace is not hidden. Every decision is explainable, reviewable, and suitable for a future agent-following experience.

## What It Does

- Fetches live markets and prices from Polymarket Gamma + CLOB APIs.
- Uses Gemini for probability estimation when quota is available.
- Falls back to a deterministic low-confidence analyzer when AI quota is exceeded.
- Computes edge versus market-implied probability.
- Sizes positions with half-Kelly and a configurable max bet cap.
- Runs in paper mode by default.
- Supports live Arc Testnet USDC transfers through Circle wallets.
- Shows wallet funding, execution mode, escrow destination, and proof-of-action in the UI.
- Includes watch mode, run history, and trace endpoints for autonomous monitoring.

## Circle + Arc Integration

Edged uses Circle Developer-Controlled Wallets as the agent treasury and execution rail.

Current live-mode flow:

1. Circle creates an Arc Testnet wallet for the agent.
2. The wallet is funded with testnet USDC.
3. Edged scans live markets and identifies an edge.
4. If `PAPER_TRADING=false`, Edged sends a capped USDC transfer to an escrow wallet.
5. The UI displays the live mode state and latest proof-of-action.

For safety, live transfers are capped with:

```env
CIRCLE_MAX_LIVE_TRADE_USDC=1
```

## Architecture

```text
Next.js app
├── Dashboard UI
├── /api/agent/run       autonomous scan/reason/size/execute loop
├── /api/agent/watch     watch-mode scan trigger and state
├── /api/agent/history   recent run history
├── /api/analyze         Gemini + fallback probability analyzer
├── /api/trace/[runId]   JSON trace for a specific run
├── /api/wallet          Circle wallet status and balances
└── lib/
    ├── polymarket.js    Gamma/CLOB market data + Kelly sizing
    └── circle.js        Circle wallet + transfer wrapper
```

## Tech Stack

- **Frontend:** Next.js 14, React
- **AI reasoning:** Google Gemini
- **Market data:** Polymarket Gamma API + CLOB API
- **Wallet execution:** Circle Developer-Controlled Wallets
- **Settlement rail:** Arc Testnet
- **Risk sizing:** Half-Kelly Criterion with configurable cap

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

```env
# AI
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
ALLOW_AI_FALLBACK=true

# Circle
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
CIRCLE_WALLET_ID=
CIRCLE_WALLET_ADDRESS=
CIRCLE_USDC_TOKEN_ID=
CIRCLE_ESCROW_ADDRESS=
CIRCLE_MAX_LIVE_TRADE_USDC=1

# Agent config
PAPER_TRADING=true
BANKROLL=100
MAX_BET_FRACTION=0.05
MIN_EDGE=0.05

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Running The Agent

Paper mode:

```env
PAPER_TRADING=true
```

Live Arc Testnet mode:

```env
PAPER_TRADING=false
CIRCLE_ESCROW_ADDRESS=0x...
CIRCLE_MAX_LIVE_TRADE_USDC=1
```

Then restart the server and click **Run agent**.

## Watch Mode

The UI can start watch mode, which keeps Edged scanning on a timer while the app is open. Each watch run is stored in memory and appears in the run history with a trace endpoint:

```text
/api/trace/run_...
```

For production, this can be upgraded to a durable database and scheduled worker. For the hackathon demo, it proves the agent can monitor, decide, and act beyond a one-off dashboard click.

## Demo Notes

The strongest demo path is:

1. Show the funded Circle Arc Testnet treasury.
2. Run Edged.
3. Open a market thesis card.
4. Show probability edge, Kelly sizing, and reasoning trace.
5. Show the audit log entry for the live Arc transfer.
6. Show the escrow wallet received test USDC.

## Safety

This is a hackathon prototype using testnet funds. It is not financial advice and does not place live Polymarket orders by default. Live mode is intentionally capped and routed through Arc Testnet USDC transfers for demo proof.
