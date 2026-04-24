import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callOpenAIJSON, SYSTEM_PROMPT } from "@/lib/openai.server";

const Input = z.object({
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

export const Route = createFileRoute("/api/final-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = Input.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Invalid input" }, { status: 400 });
          }
          const { jobDescription, resume, analysis, history } = parsed.data;

          const userMsg = `TASK: Generate the FINAL skill assessment report.

JOB DESCRIPTION:
"""
${jobDescription}
"""

CANDIDATE RESUME:
"""
${resume}
"""

INSTANT ANALYSIS (pre-questioning):
${JSON.stringify(analysis).slice(0, 4000)}

CHAT ASSESSMENT TRANSCRIPT (${history.length} exchanges):
${history.map((h, i) => `[${i + 1}] (skill: ${h.skill}, difficulty: ${h.difficulty})\nQ: ${h.question}\nA: ${h.answer}`).join("\n\n") || "(no chat assessment performed)"}

Now produce the final report. Return ONLY valid JSON:
{
  "skills_required": [string],
  "skills_identified": [string],
  "skill_assessment": [
    {
      "skill": string,
      "level": "Beginner" | "Intermediate" | "Advanced" | "Unverified",
      "score": number,                  // 0-100. Beginner 0-40, Intermediate 41-75, Advanced 76-100
      "confidence": "Low" | "Medium" | "High",   // High only if directly verified by chat
      "evidence": string,               // cite resume + chat answer when relevant
      "verified": boolean               // true only if confirmed via chat questioning
    }
  ],
  "skill_gaps": [string],
  "learning_plan": [
    {
      "skill": string,
      "priority": "High" | "Medium" | "Low",
      "estimated_time": string,         // realistic, e.g. "4-6 weeks (1h/day)"
      "resources": [
        {
          "title": string,
          "type": "Free" | "Paid",
          "platform": string,           // YouTube, Coursera, Udemy, freeCodeCamp, MDN, official docs, edX
          "link": string                // real, well-known URL only
        }
      ],
      "project_suggestion": string      // 1 concrete project to build
    }
  ],
  "overall_summary": string             // 3-4 sentences, candid assessment
}

Rules:
- The learning_plan should ONLY cover skill_gaps and weak areas (Beginner level for required skills). Max 6 items, prioritized.
- Each plan item: 2-3 resources, mix Free + Paid.
- Use ONLY real platforms and well-known URLs. Never invent course titles.
- Be candid in overall_summary — list strengths and weaknesses honestly.`;

          const result = await callOpenAIJSON({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
            model: "gpt-4o-mini",
          });

          return Response.json(result);
        } catch (e) {
          console.error("final-report error:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
