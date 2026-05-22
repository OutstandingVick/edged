# Edged
**Autonomous AI prediction market trader** · Agora Hackathon 2026

> Scans Polymarket → Gemini estimates edge → Kelly sizes bet → Executes autonomously

## Stack
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Markets**: Polymarket CLOB + Gamma API
- **Settlement**: Arc L1 · Circle Wallets (Day 3)
- **Frontend**: Next.js 14

## Setup

```bash
npm install
cp .env.local.example .env.local
# Add GEMINI_API_KEY from aistudio.google.com
npm run dev
```

Open `http://localhost:3000` → click **RUN AGENT**

## How it works
1. Fetches top Polymarket markets by volume
2. Gemini estimates true probability vs market-implied price
3. Kelly Criterion (half-Kelly, 5% cap) sizes each position
4. Agent executes autonomously — paper mode by default
5. Full reasoning trace displayed publicly

## Config (`.env.local`)
```
GEMINI_API_KEY=...
PAPER_TRADING=true
BANKROLL=100
MIN_EDGE=0.05
```

Built by [@outstandingvick](https://x.com/outstandingvick) · SuperteamNG
