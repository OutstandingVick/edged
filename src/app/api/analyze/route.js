export const runtime = "nodejs";

async function callGemini(model, prompt) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );
}

function fallbackAnalysis(market, reason = "Gemini unavailable") {
  const yesPrice = Number(market.yesPrice || 0.5);
  const volume = Number(market.volume24hr || 0);
  const volatilityNudge = Math.min(0.08, Math.log10(Math.max(volume, 10)) / 100);
  const crowdedExtreme = yesPrice > 0.85 ? -0.08 : yesPrice < 0.15 ? 0.08 : 0;
  const probability = Math.max(0.03, Math.min(0.97, yesPrice + crowdedExtreme + volatilityNudge));
  const edge = probability - yesPrice;
  const recommendation = Math.abs(edge) >= 0.05 ? (edge > 0 ? "BET_YES" : "BET_NO") : "PASS";

  return {
    probability: Number(probability.toFixed(3)),
    confidence: "low",
    edge: Number(edge.toFixed(3)),
    recommendation,
    keyInsight: `${reason}. Fallback model adjusted the market price for extreme crowding and liquidity.`,
    reasoningTrace:
      `Fallback analysis used the current YES price as the base rate, then applied a small liquidity adjustment from 24h volume. ` +
      `Extreme prices were mean-reverted to avoid blindly following crowded markets. ` +
      `This trace is deterministic and should be replaced by Gemini when quota is available.`,
    fallback: true,
  };
}

export async function POST(req) {
  const { market } = await req.json();
  if (!market) return Response.json({ error: "No market" }, { status: 400 });

  const prompt = `You are an autonomous AI prediction market trader called Edged.

Analyze this market and estimate the true probability of YES:

Market: "${market.question}"
Current YES price: ${(market.yesPrice * 100).toFixed(1)}% (market-implied probability)
Volume 24h: $${parseFloat(market.volume24hr || 0).toLocaleString()}

Think about base rates, what information the crowd might be missing, and your confidence.

Respond ONLY with valid JSON, no markdown:
{
  "probability": <number 0-1>,
  "confidence": "low" | "medium" | "high",
  "edge": <your_probability minus market_yesPrice>,
  "recommendation": "BET_YES" | "BET_NO" | "PASS",
  "keyInsight": "<1-2 sentences on the most important factor>",
  "reasoningTrace": "<3-4 sentences of step by step reasoning>"
}`;

  try {
    const models = [process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-2.5-flash"];
    let res = null;
    let err = "";

    for (const model of models) {
      res = await callGemini(model, prompt);
      if (res.ok) break;
      err = await res.text();
      if (!err.includes("NOT_FOUND") && !err.includes("not found")) break;
    }

    if (!res?.ok) {
      console.error("Gemini error:", err);
      if (err.includes("429") || err.includes("quota") || process.env.ALLOW_AI_FALLBACK !== "false") {
        return Response.json(fallbackAnalysis(market, "Gemini quota exceeded"));
      }
      return Response.json({ error: "Gemini API error", details: err.slice(0, 300) }, { status: 500 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        probability: market.yesPrice,
        confidence: "low",
        edge: 0,
        recommendation: "PASS",
        keyInsight: "Could not parse response.",
        reasoningTrace: raw.slice(0, 300),
      };
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
