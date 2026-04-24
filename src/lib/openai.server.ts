// Server-only helpers for calling OpenAI. Never import from client code.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenAIJSON<T extends Record<string, unknown> = Record<string, unknown>>(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "gpt-4o-mini",
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited by OpenAI. Please try again shortly.");
    if (res.status === 401) throw new Error("Invalid OpenAI API key.");
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  try {
    return JSON.parse(content) as T;
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
