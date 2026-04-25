
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
export const instantAnalysis = async (data: { jobDescription: string; resume: string }) => {
  return await localInstantAnalysis(data.jobDescription, data.resume);
};

// ---------- nextQuestion ----------
export const nextQuestion = async (data: { 
  jobDescription: string; 
  analysis: InstantAnalysis; 
  history: QAExchange[];
  webQuestions?: string[];
}) => {
  return await localNextQuestion(data.jobDescription, data.analysis, data.history, data.webQuestions);
};

// ---------- searchQuestions ----------
export const searchQuestions = async (_data: { skill: string }) => {
  // Browser-side fallback: duck-duck-scrape doesn't work in-browser due to CORS/Node dependencies.
  return [];
};

// ---------- finalReport ----------
export const finalReport = async (data: { 
  jobDescription: string; 
  resume: string; 
  analysis: InstantAnalysis; 
  history: QAExchange[] 
}) => {
  return await localFinalReport(data.jobDescription, data.resume, data.analysis, data.history);
};

