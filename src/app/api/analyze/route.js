export const runtime = "nodejs";

export async function POST(req) {
  const { market } = await req.json();
  if (!market) return Response.json({ error: "No market" }, { status: 400 });

  const prompt = `You are an autonomous AI prediction market trader called AgentOracle.

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return Response.json({ error: "Gemini API error" }, { status: 500 });
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
