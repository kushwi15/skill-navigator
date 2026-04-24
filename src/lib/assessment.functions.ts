import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { callOpenAIJSON, SYSTEM_PROMPT } from "@/lib/openai.server";

// ---------- parseResume ----------
export const parseResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Expected FormData");
    const file = input.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10MB)");
    return { file };
  })
  .handler(async ({ data }) => {
    const { file } = data;
    const name = file.name.toLowerCase();
    const buf = new Uint8Array(await file.arrayBuffer());
    let text = "";

    try {
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        const pdf = await getDocumentProxy(buf);
        const result = await extractText(pdf, { mergePages: true });
        text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
      } else if (name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
        text = result.value;
      } else if (name.endsWith(".txt") || file.type === "text/plain") {
        text = new TextDecoder().decode(buf);
      } else {
        throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
      }
    } catch (e) {
      console.error("parse error:", e);
      throw new Error(e instanceof Error ? e.message : "Failed to parse file");
    }

    text = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 30) throw new Error("Could not extract meaningful text from file.");
    return { text };
  });

// ---------- instantAnalysis ----------
const InstantInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
});

export const instantAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InstantInput.parse(input))
  .handler(async ({ data }) => {
    const userMsg = `TASK: Instant skill analysis (no questioning yet).

JOB DESCRIPTION:
"""
${data.jobDescription}
"""

CANDIDATE RESUME:
"""
${data.resume}
"""

Return ONLY valid JSON with this exact shape:
{
  "skills_required": [string],
  "skills_identified": [string],
  "skill_assessment": [
    {
      "skill": string,
      "level": "Beginner" | "Intermediate" | "Advanced" | "Unverified",
      "confidence": "Low" | "Medium" | "High",
      "evidence": string,
      "verified": false
    }
  ],
  "skill_gaps": [string],
  "overall_summary": string
}

Rules:
- Mark all skills as "Unverified" with confidence "Low" or "Medium" since we have not questioned the candidate yet.
- For skills with strong resume evidence, confidence may be "Medium". Never use "High" at this stage.
- Cover ALL required skills in skill_assessment, even gaps (mark gaps as level "Beginner", confidence "Low", evidence "Not found in resume").
- Extract 8-20 required skills from the JD.`;

    return await callOpenAIJSON({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    });
  });

// ---------- nextQuestion ----------
const NextQInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  analysis: z.unknown(),
  history: z
    .array(
      z.object({
        skill: z.string(),
        question: z.string(),
        answer: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
    )
    .max(50),
});

export const nextQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NextQInput.parse(input))
  .handler(async ({ data }) => {
    const userMsg = `TASK: Generate the next adaptive assessment question OR signal completion.

JOB DESCRIPTION (truncated):
"""
${data.jobDescription.slice(0, 2000)}
"""

INSTANT ANALYSIS:
${JSON.stringify(data.analysis).slice(0, 4000)}

CONVERSATION SO FAR (${data.history.length} exchanges):
${
  data.history
    .map(
      (h, i) =>
        `[${i + 1}] (${h.skill}, ${h.difficulty})\nQ: ${h.question}\nA: ${h.answer}`
    )
    .join("\n\n") || "(none yet)"
}

Rules:
- Ask ONE focused question at a time targeting the most important unverified skill.
- Adaptive difficulty: if last answer was strong, raise difficulty; if weak, simplify or pivot.
- Cover top 4-6 required skills before signaling done. Never ask more than 8 questions total.
- Skip skill_gaps (skills the candidate clearly doesn't have).
- Question should be technical and concrete.

Return ONLY valid JSON:
{
  "done": boolean,
  "question": string | null,
  "skill": string | null,
  "difficulty": "easy" | "medium" | "hard" | null,
  "reason": string
}`;

    return await callOpenAIJSON({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.5,
    });
  });

// ---------- finalReport ----------
const FinalInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
  analysis: z.unknown(),
  history: z.array(
    z.object({
      skill: z.string(),
      question: z.string(),
      answer: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    })
  ),
});

export const finalReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FinalInput.parse(input))
  .handler(async ({ data }) => {
    const userMsg = `TASK: Generate the FINAL skill assessment report.

JOB DESCRIPTION:
"""
${data.jobDescription}
"""

CANDIDATE RESUME:
"""
${data.resume}
"""

INSTANT ANALYSIS (pre-questioning):
${JSON.stringify(data.analysis).slice(0, 4000)}

CHAT ASSESSMENT TRANSCRIPT (${data.history.length} exchanges):
${
  data.history
    .map(
      (h, i) =>
        `[${i + 1}] (skill: ${h.skill}, difficulty: ${h.difficulty})\nQ: ${h.question}\nA: ${h.answer}`
    )
    .join("\n\n") || "(no chat assessment performed)"
}

Now produce the final report. Return ONLY valid JSON:
{
  "skills_required": [string],
  "skills_identified": [string],
  "skill_assessment": [
    {
      "skill": string,
      "level": "Beginner" | "Intermediate" | "Advanced" | "Unverified",
      "score": number,
      "confidence": "Low" | "Medium" | "High",
      "evidence": string,
      "verified": boolean
    }
  ],
  "skill_gaps": [string],
  "learning_plan": [
    {
      "skill": string,
      "priority": "High" | "Medium" | "Low",
      "estimated_time": string,
      "resources": [
        {
          "title": string,
          "type": "Free" | "Paid",
          "platform": string,
          "link": string
        }
      ],
      "project_suggestion": string
    }
  ],
  "overall_summary": string
}

Scoring scale: Beginner 0-40, Intermediate 41-75, Advanced 76-100.
Rules:
- learning_plan covers ONLY skill_gaps and weak areas (Beginner level for required skills). Max 6 items, prioritized.
- Each plan item: 2-3 resources, mix Free + Paid.
- Use ONLY real, well-known platforms and URLs (YouTube, Coursera, Udemy, freeCodeCamp, MDN, official docs, edX). Never invent course titles.
- Set verified=true only if the skill was confirmed via chat answers.
- Be candid in overall_summary — strengths AND weaknesses honestly.`;

    return await callOpenAIJSON({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.3,
    });
  });
