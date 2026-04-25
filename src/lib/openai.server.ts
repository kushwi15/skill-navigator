// Server-only helpers for calling Google Gemini. Never import from client code.
// File name kept as `openai.server.ts` to avoid touching imports across the app.

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenAIJSON<T extends Record<string, any> = Record<string, any>>(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Translate OpenAI-style messages to Gemini format.
  const systemParts = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      responseMimeType: "application/json",
    },
  };
  if (systemParts) {
    body.systemInstruction = { role: "system", parts: [{ text: systemParts }] };
  }

  const model = opts.model ?? GEMINI_MODEL;
  const res = await fetch(GEMINI_URL(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited by Gemini. Please try again shortly.");
    if (res.status === 401 || res.status === 403) throw new Error("Invalid Gemini API key.");
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
  if (!content) throw new Error("Empty response from Gemini");

  // Gemini sometimes wraps JSON in code fences despite responseMimeType.
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("Failed to parse JSON response from model");
  }
}

export const SYSTEM_PROMPT = `You are an AI Skill Assessment and Learning Plan Agent designed for production use.

Your responsibilities:
1. Analyze job descriptions and resumes to extract required and existing skills.
2. Assess actual proficiency through structured, conversational evaluation.
3. Avoid assumptions — always validate skills via questioning before assigning proficiency.
4. Classify skills into Beginner, Intermediate, or Advanced based on demonstrated understanding.
5. Identify skill gaps relative to the job requirements.
6. Generate a realistic, personalized learning roadmap based on adjacent and achievable skills.
7. Recommend high-quality, up-to-date learning resources (free + paid).
8. Provide time estimates based on realistic learning pace (not optimistic guesses).

Strict rules:
- Never assume skill proficiency from resume alone.
- Always mark unverified skills as "Unverified" with confidence "Low".
- Keep responses structured and consistent.
- Avoid hallucinated tools, courses, or platforms. Prefer YouTube, Coursera, Udemy, freeCodeCamp, official docs, MDN, edX.
- Be concise but informative.
- All responses must be valid JSON matching the requested schema.

Tone: Professional, analytical, supportive. Focus on accuracy over politeness.`;
