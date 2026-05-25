# Edged

Autonomous market intelligence for prediction markets.

Edged scans live Polymarket markets, estimates fair probability with AI, sizes exposure with half-Kelly, publishes a reasoning trace, and can execute capped USDC actions through Circle developer-controlled wallets on Arc Testnet.

Built for the Agora Agents Hackathon by [@outstandingvick](https://x.com/outstandingvick) / SuperteamNG.

![Edged logo](public/edged-logo.svg)

## Why

Prediction markets turn public belief into prices, but acting on those prices still takes a lot of manual work: finding markets, estimating fair odds, sizing risk, and executing. Edged packages that workflow into an agent loop:

```text
scan markets -> reason about fair odds -> size risk -> execute -> publish trace
```

The important part is transparency. Each decision includes a reasoning trace so the agent's actions can be inspected instead of treated as a black box.

## What It Does

- Fetches live markets and prices from Polymarket Gamma and CLOB APIs.
- Uses DeepSeek for structured probability estimates, with Gemini available as a fallback provider.
- Computes edge against market-implied probability.
- Sizes exposure with half-Kelly and a configurable max bet cap.
- Runs in paper mode by default.
- Supports capped Arc Testnet USDC transfers through Circle wallets.
- Shows treasury balance, execution mode, escrow destination, action history, and trace links in the UI.
- Includes watch mode for repeated scans while the app is open.

## Circle + Arc

Edged uses Circle Developer-Controlled Wallets as the agent treasury and execution rail.

Live-mode flow:

1. Circle creates or loads the agent wallet on Arc Testnet.
2. The wallet is funded with testnet USDC.
3. Edged scans live markets and identifies an edge.
4. If live mode is enabled, Edged sends a capped USDC transfer to an escrow wallet.
5. The dashboard and Circle Console show the completed action.

Live execution is capped for safety:

```env
CIRCLE_MAX_LIVE_TRADE_USDC=1
```

## Architecture

```text
Next.js app
├── Dashboard UI
├── /api/agent/run       scan, reason, size, execute
├── /api/agent/watch     watch-mode trigger and state
├── /api/agent/history   in-memory run history
├── /api/analyze         DeepSeek/Gemini probability analyzer
├── /api/trace/[runId]   JSON trace for a run
├── /api/wallet          Circle wallet status and balances
└── lib/
    ├── agent.js         agent loop
    ├── circle.js        Circle wallet and transfer wrapper
    ├── polymarket.js    market data and Kelly sizing
    └── runs.js          in-memory run store
```

## Tech Stack

- **Frontend:** Next.js 14, React
- **AI reasoning:** DeepSeek, with optional Gemini fallback
- **Market data:** Polymarket Gamma API and CLOB API
- **Wallet execution:** Circle Developer-Controlled Wallets
- **Settlement rail:** Arc Testnet
- **Risk sizing:** Half-Kelly with a configurable cap

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

```env
# AI
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
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

# Agent
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

Restart the server after changing env vars, then click **Run agent**.

## Demo Path

1. Show the funded Circle Arc Testnet treasury.
2. Run Edged or open a previous run.
3. Open a market thesis card.
4. Show the AI provider tag, probability edge, Kelly size, and reasoning trace.
5. Show `Arc transfer` in the UI.
6. Show the completed outbound/inbound transfer in Circle Console.

## Safety

This is a hackathon prototype using testnet funds. It is not financial advice and does not place live Polymarket orders. Live mode is intentionally capped and uses Arc Testnet USDC transfers for proof of action.
