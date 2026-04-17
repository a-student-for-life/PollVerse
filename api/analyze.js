export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, recentReasons, options, mode, ideaCloud } = req.body;

  if (!recentReasons || recentReasons.length === 0) {
    return res.status(400).json({ error: 'No user reasoning available to generate insight.' });
  }

  // Ensure reasons are strings and truncate long ones for safety
  const reasonsText = recentReasons
    .map(r => `- "${String(r.text).substring(0, 200)}"`)
    .join('\n');

  const distributionText = Array.isArray(options) 
    ? options.map(o => `- ${o.text}: ${o.voteCount} votes`).join('\n')
    : "Data unavailable";

  // Include community ideas if present (top 3 by weight)
  const topIdeas = Array.isArray(ideaCloud) && ideaCloud.length > 0
    ? [...ideaCloud].sort((a, b) => b.weight - a.weight).slice(0, 3)
    : [];
  const ideasText = topIdeas.length > 0
    ? `\nCommunity Alternative Ideas (user-submitted, not official options):\n${topIdeas.map(i => `- "${i.text}" (${i.weight} endorsements)`).join('\n')}`
    : '';

  // ─── Tone instructions based on mode ────────────────────────────
  const toneBlock = mode === 'professional'
    ? `Tone & Style:
- Write exactly 1 or 2 concise, clear sentences.
- Be neutral, analytical, and professional. Think sharp executive summary.
- DO NOT use slang, casual phrasing, or filler words.
- DO NOT use robotic phrases like "The results show", "This indicates", "Overall", or "In conclusion".
- Sound like a sharp analyst explaining findings to a colleague — direct and human, but formal.
- If there are notable dissenting views in the reasons or community ideas, briefly acknowledge them in a neutral way.`
    : `Tone & Style:
- Write exactly 1 or 2 short, punchy sentences.
- Adopt a casual, conversational, slightly witty tone (like a quick Reddit TL;DR).
- DO NOT use formal robotic phrases like "The results show", "This indicates", or "Users prefer".
- Sound like a smart human quickly explaining the consensus to a friend.
- Keep it balanced: if there's a vocal minority or wild community idea trending, mention it briefly — the contrast is interesting.`;

  const prompt = `You are analyzing a poll titled: "${title}".

Current Vote Distribution:
${distributionText}
${ideasText}

Real User Reasons:
${reasonsText}

${toneBlock}

Core Rules:
- You MUST respect the "Current Vote Distribution" as the absolute ground truth.
- Synthesize the "what" (which option is winning) with the "why" (use the Real User Reasons to explain *why* it's winning).
- If dissent exists in the reasons or community ideas, acknowledge it briefly without undermining the majority result.
- If there is no clear reason or very few votes, acknowledge the tiny sample size naturally.
- NEVER contradict the vote counts.

TL;DR Summary:`;

  try {
    // API KEY READ FROM ENVIRONMENT. NEVER HARDCODE.
    // Ensure you place your API key in .env.local for local development.
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey || groqApiKey === 'your_api_key_here') {
      console.warn("GROQ_API_KEY environment variable missing or unconfigured.");
      return res.status(200).json({ 
        summary: "Notice: The AI system relies on Groq, but the GROQ_API_KEY is not configured yet. Set it in .env.local or your deployment dashboard to activate insights!" 
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: mode === 'professional' ? 0.3 : 0.5,
        max_tokens: 150
      })
    });

    const textRaw = await response.text();
    let data;
    try {
      data = JSON.parse(textRaw);
    } catch (e) {
      console.error("Groq API returned non-JSON:", textRaw);
      throw new Error("Upstream API returned an invalid response.");
    }
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate insight');
    }

    const summary = data.choices[0].message.content.trim();
    res.status(200).json({ summary });

  } catch (error) {
    console.error('AI Insight Error:', error.message || error);
    res.status(500).json({ error: 'AI Consensus generation failed: ' + (error.message || 'Unknown Error') });
  }
}
