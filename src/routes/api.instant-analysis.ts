import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callOpenAIJSON, SYSTEM_PROMPT } from "@/lib/openai.server";

const Input = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
});

export const Route = createFileRoute("/api/instant-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = Input.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
          }
          const { jobDescription, resume } = parsed.data;

          const userMsg = `TASK: Instant skill analysis (no questioning yet).

JOB DESCRIPTION:
"""
${jobDescription}
"""

CANDIDATE RESUME:
"""
${resume}
"""

Return ONLY valid JSON with this exact shape:
{
  "skills_required": [string],          // skills from JD (8-20 items, normalized names)
  "skills_identified": [string],        // skills evidenced in resume
  "skill_assessment": [
    {
      "skill": string,
      "level": "Beginner" | "Intermediate" | "Advanced" | "Unverified",
      "confidence": "Low" | "Medium" | "High",
      "evidence": string,               // 1 sentence quoting/citing resume
      "verified": false                 // always false at this stage
    }
  ],
  "skill_gaps": [string],               // required skills missing from resume
  "overall_summary": string             // 2-3 sentences, neutral tone
}

Rules:
- Mark all skills as "Unverified" with confidence "Low" or "Medium" since we have not questioned the candidate yet.
- For skills with strong resume evidence (years, projects, titles), confidence may be "Medium".
- Never use "High" confidence at this stage.
- Cover ALL required skills in skill_assessment, even gaps (mark gap skills as level "Beginner", confidence "Low", evidence "Not found in resume").`;

          const result = await callOpenAIJSON({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
          });

          return Response.json(result);
        } catch (e) {
          console.error("instant-analysis error:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
