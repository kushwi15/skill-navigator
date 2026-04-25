// This file now proxies to the local-ai engine to avoid external API calls.
import { 
  localInstantAnalysis, 
  localNextQuestion, 
  localFinalReport 
} from "./local-ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Dummy function to keep types compatible, though not used in the local flow
export async function callOpenAIJSON<T extends Record<string, any>>(opts: any): Promise<T> {
  // This is a fallback in case some code still calls this directly
  return {} as T;
}

// We redefine the assessment functions in assessment.functions.ts to use local-ai directly
// but keeping this file for compatibility if needed.

export const SYSTEM_PROMPT = "Local Heuristic Engine active.";
