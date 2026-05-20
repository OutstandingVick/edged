// Polymarket public API — no key required for market data
const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

export async function getMarkets(limit = 10) {
  const res = await fetch(
    `${GAMMA}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`
  );
  if (!res.ok) throw new Error("Failed to fetch markets");
  return res.json();
}

export async function getPrice(tokenId) {
  const res = await fetch(`${CLOB}/price?token_id=${tokenId}&side=buy`);
  if (!res.ok) return null;
  const data = await res.json();
  return parseFloat(data.price);
}

export async function getMarketsWithPrices(limit = 8) {
  const markets = await getMarkets(limit);
  const enriched = await Promise.all(
    markets.map(async (m) => {
      const tokenId = m.clobTokenIds?.[0];
      if (!tokenId) return null;
      const yesPrice = await getPrice(tokenId);
      if (!yesPrice) return null;
      return { ...m, yesPrice, noPrice: 1 - yesPrice, yesTokenId: tokenId };
    })
  );
  return enriched.filter(Boolean);
}

// Kelly Criterion position sizing
export function kellyBet(agentProb, marketPrice, bankroll, fraction = 0.5, cap = 0.05) {
  const betYes = agentProb > marketPrice;
  const p = betYes ? agentProb : 1 - agentProb;
  const betPrice = betYes ? marketPrice : 1 - marketPrice;
  const b = (1 - betPrice) / betPrice;
  const kelly = (b * p - (1 - p)) / b;
  if (kelly <= 0) return null;
  const size = Math.min(kelly * fraction, cap) * bankroll;
  return {
    side: betYes ? "YES" : "NO",
    edge: Math.abs(agentProb - marketPrice),
    edgePct: `${(Math.abs(agentProb - marketPrice) * 100).toFixed(1)}%`,
    betSize: Math.round(size * 100) / 100,
  };
}
