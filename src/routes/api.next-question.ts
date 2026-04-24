import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callOpenAIJSON, SYSTEM_PROMPT } from "@/lib/openai.server";

const Input = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
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

export const Route = createFileRoute("/api/next-question")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = Input.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Invalid input" }, { status: 400 });
          }
          const { jobDescription, analysis, history } = parsed.data;

          const userMsg = `TASK: Generate the next adaptive assessment question OR signal completion.

JOB DESCRIPTION (truncated):
"""
${jobDescription.slice(0, 2000)}
"""

INSTANT ANALYSIS:
${JSON.stringify(analysis).slice(0, 4000)}

CONVERSATION SO FAR (${history.length} exchanges):
${history.map((h, i) => `[${i + 1}] (${h.skill}, ${h.difficulty})\nQ: ${h.question}\nA: ${h.answer}`).join("\n\n") || "(none yet)"}

Rules:
- Ask ONE focused question at a time targeting the most important unverified skill.
- Adaptive difficulty: if last answer was strong, raise difficulty; if weak, simplify or move on.
- Cover top 4-6 required skills before signaling done. Never ask more than 8 questions total.
- Skip skill_gaps (skills the candidate clearly doesn't have) — focus on verifying claimed skills.
- Question should be technical and concrete (e.g., "Explain how X works", "How would you debug Y?").

Return ONLY valid JSON:
{
  "done": boolean,                                       // true when enough coverage achieved
  "question": string | null,                             // null if done
  "skill": string | null,                                // skill being assessed
  "difficulty": "easy" | "medium" | "hard" | null,
  "reason": string                                       // 1 sentence justifying choice
}`;

          const result = await callOpenAIJSON({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            temperature: 0.5,
          });

          return Response.json(result);
        } catch (e) {
          console.error("next-question error:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
