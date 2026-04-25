import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  localInstantAnalysis, 
  localNextQuestion, 
  localFinalReport 
} from "@/lib/local-ai";
import type { InstantAnalysis, QAExchange } from "@/lib/types";

// Helper to simulate thinking time
const think = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------- instantAnalysis ----------
const InstantInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
});

export const instantAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InstantInput.parse(input))
  .handler(async ({ data }) => {
    return await localInstantAnalysis(data.jobDescription, data.resume);
  });

// ---------- nextQuestion ----------
const NextQInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  analysis: z.any(),
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
    return await localNextQuestion(data.jobDescription, data.analysis as InstantAnalysis, data.history as QAExchange[]);
  });

import { search, SafeSearchType } from "duck-duck-scrape";

// ---------- searchQuestions ----------
const SearchQInput = z.object({
  skill: z.string(),
});

export const searchQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchQInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const results = await search(`latest technical interview questions for ${data.skill} 2024 2025`, {
        safeSearch: SafeSearchType.STRICT,
      });
      // Extract snippets that look like questions
      const questions = results.results
        .map(r => r.description)
        .filter(d => d.includes("?") || d.length > 50)
        .slice(0, 10);
      return questions;
    } catch (e) {
      console.error("Search failed", e);
      return [];
    }
  });

// ---------- finalReport ----------
const FinalInput = z.object({
  jobDescription: z.string().min(20).max(20000),
  resume: z.string().min(20).max(50000),
  analysis: z.any(),
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
    return await localFinalReport(data.jobDescription, data.resume, data.analysis as InstantAnalysis, data.history as QAExchange[]);
  });
