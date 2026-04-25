import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
// @ts-expect-error - Internal path needed for ESM compatibility
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { 
  localInstantAnalysis, 
  localNextQuestion, 
  localFinalReport 
} from "@/lib/local-ai";
import type { InstantAnalysis, QAExchange } from "@/lib/types";

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
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    let text = "";

    try {
      console.log("Parsing file:", name, "type:", file.type, "size:", file.size);
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        console.log("Attempting PDF parse...");
        const pdfData = await pdfParse(buf);
        text = pdfData.text;
        console.log("PDF parse successful, extracted", text.length, "chars");
      } else if (name.endsWith(".docx")) {
        console.log("Attempting DOCX parse...");
        const result = await mammoth.extractRawText({ buffer: buf });
        text = result.value;
      } else if (name.endsWith(".txt") || file.type === "text/plain") {
        text = new TextDecoder().decode(buf);
      } else {
        throw new Error(`Unsupported file type: ${name} (${file.type}). Use PDF, DOCX, or TXT.`);
      }
    } catch (e) {
      console.error("DETAILED PARSE ERROR:", e);
      throw new Error(`Parse failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    text = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 30) throw new Error("Could not extract meaningful text from file.");
    return { text };
  });

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
