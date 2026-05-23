export const runtime = "nodejs";

function cleanJson(raw) {
  return String(raw || "{}").replace(/```json|```/g, "").trim();
}

function parseAnalysis(raw, market, provider) {
  let parsed;

  try {
    parsed = JSON.parse(cleanJson(raw));
  } catch {
    parsed = {
      probability: market.yesPrice,
      confidence: "low",
      edge: 0,
      recommendation: "PASS",
      keyInsight: "Could not parse model response.",
      reasoningTrace: String(raw || "").slice(0, 300),
    };
  }

  return {
    ...parsed,
    probability: Number(parsed.probability ?? market.yesPrice),
    edge: Number(parsed.edge ?? Number(parsed.probability ?? market.yesPrice) - market.yesPrice),
    provider,
  };
}

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

async function callDeepSeek(model, prompt) {
  return fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are Edged, an autonomous prediction market trading agent. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });
}

function fallbackAnalysis(market, reason = "AI provider unavailable") {
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
    keyInsight: `${reason}. Backup estimator adjusted the market price for extreme crowding and liquidity.`,
    reasoningTrace:
      `Fallback analysis used the current YES price as the base rate, then applied a small liquidity adjustment from 24h volume. ` +
      `Extreme prices were mean-reverted to avoid blindly following crowded markets. ` +
      `This trace is deterministic and clearly marked as a backup estimate.`,
    fallback: true,
    provider: "fallback",
  };
}

async function analyzeWithDeepSeek(prompt, market) {
  if (!process.env.DEEPSEEK_API_KEY) return { error: "Missing DEEPSEEK_API_KEY" };

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const res = await callDeepSeek(model, prompt);
  if (!res.ok) return { error: await res.text() };

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  return { analysis: parseAnalysis(raw, market, "deepseek") };
}

async function analyzeWithGemini(prompt, market) {
  if (!process.env.GEMINI_API_KEY) return { error: "Missing GEMINI_API_KEY" };

  const models = [process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-2.5-flash"];
  let err = "";

  for (const model of models) {
    const res = await callGemini(model, prompt);
    if (res.ok) {
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      return { analysis: parseAnalysis(raw, market, "gemini") };
    }

    err = await res.text();
    if (!err.includes("NOT_FOUND") && !err.includes("not found")) break;
  }

  return { error: err || "Gemini API error" };
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
    const preferredProvider = process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? "deepseek" : "gemini");
    const providers = preferredProvider === "deepseek" ? ["deepseek", "gemini"] : ["gemini", "deepseek"];
    const errors = [];

    for (const provider of providers) {
      const result = provider === "deepseek" ? await analyzeWithDeepSeek(prompt, market) : await analyzeWithGemini(prompt, market);
      if (result.analysis) return Response.json(result.analysis);

      console.error(`${provider} error:`, result.error);
      errors.push(`${provider}: ${String(result.error).slice(0, 180)}`);

      const isQuotaError = String(result.error).includes("429") || String(result.error).toLowerCase().includes("quota");
      if (!isQuotaError && provider === preferredProvider) {
        continue;
      }
    }

    if (process.env.ALLOW_AI_FALLBACK !== "false") {
      return Response.json(fallbackAnalysis(market, "Primary AI providers unavailable"));
    }

    return Response.json({ error: "AI provider error", details: errors.join("\n") }, { status: 500 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
