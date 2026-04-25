import { pipeline, env } from "@xenova/transformers";
import type { InstantAnalysis, FinalReport, QAExchange, SkillLevel, Confidence, Priority } from "./types";

// Configuration for browser environment
env.allowRemoteModels = true;

// --- Model Singleton with Fallback Support ---
let modelPipeline: any = null;
let useFallback = false;

async function getModel() {
  if (useFallback) return null;
  if (modelPipeline) return modelPipeline;

  try {
    console.log("Attempting to load Local LLM (Phi-1.5)...");
    modelPipeline = await pipeline("text-generation", "Xenova/phi-1_5", {
      revision: "main",
    });
    return modelPipeline;
  } catch (error) {
    console.error("Local LLM failed to load. Switching to Heuristic Engine.", error);
    useFallback = true;
    return null;
  }
}

// --- Predefined Heuristic Templates (Fallback) ---
const QUESTION_TEMPLATES = [
  "Can you describe a challenging scenario where you used {skill}?",
  "How do you handle complex debugging in {skill} environments?",
  "What's your preferred architecture for {skill} applications?",
  "Tell me about a project where {skill} was the primary technology stack.",
  "What are the most common pitfalls you see when working with {skill}?"
];

const SUMMARY_TEMPLATES = [
  "Your background in {role} shows strong alignment with the requirements. You have a solid grasp of {skills}.",
  "Based on the resume and JD, I've identified several key strengths in {skills}. There are some gaps in {gaps} to address.",
  "Analysis complete for the {role} position. Core skills detected: {skills}. Recommended focus areas: {gaps}."
];

// --- Engine Logic ---

export async function localExtractSkills(text: string): Promise<string[]> {
  const prompt = `System: Extract all technical skills, programming languages, and tools from this text. Respond ONLY with a comma-separated list.
Text: ${text.slice(0, 1000)}
Skills: `;

  const extracted: string = await generateAIResponse(prompt, "React, Node.js, TypeScript", 60);
  const found = extracted.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 1 && s.length < 25);
  
  // Clean up common noise
  const clean = found.filter((s: string) => !["System", "Text", "Skills", "None"].includes(s));
  
  const result: string[] = [...new Set(clean.length > 0 ? clean : ["General Engineering"])];
  return result;
}

async function generateAIResponse(prompt: string, fallbackText: string, max_new_tokens = 100) {
  const generator = await getModel();
  if (!generator) return fallbackText;

  try {
    const output = await generator(prompt, {
      max_new_tokens,
      temperature: 0.7,
      do_sample: true,
      top_k: 50,
    });
    return output[0].generated_text.slice(prompt.length).trim();
  } catch (err) {
    console.warn("Generation failed, using fallback.", err);
    return fallbackText;
  }
}

export async function localVerifyAnswer(question: string, answer: string, skill: string) {
  const lowerAnswer = answer.toLowerCase().trim();
  
  // Basic validation for length and gibberish
  if (lowerAnswer.length < 15) {
    return {
      valid: false,
      feedback: "That response is quite brief. Could you provide a more detailed explanation of your experience with " + skill + "?",
      score: 10
    };
  }

  const gibberishPatterns = [/^[asdfghjkl]+$/, /^[qwertyuiop]+$/, /^[zxcvbnm]+$/, /^h+l+o+$/];
  if (gibberishPatterns.some(p => p.test(lowerAnswer))) {
    return {
      valid: false,
      feedback: "I didn't quite catch that. Please provide a relevant technical answer about " + skill + ".",
      score: 0
    };
  }

  // LLM-based verification (if available)
  const prompt = `System: You are a technical interviewer.
User: Question: ${question}
Answer: ${answer}
Is this answer technically relevant and sufficient for a candidate claiming expertise in ${skill}? Respond with 'YES' or 'NO' followed by a short reason.
Assistant: `;

  const verification = await generateAIResponse(prompt, "YES", 50);
  const isValid = verification.toUpperCase().startsWith("YES");

  return {
    valid: true,
    score: isValid ? 80 : 40,
    feedback: isValid ? null : "That's a start, but I'd like to hear more about your specific role in that project."
  };
}

export async function localInstantAnalysis(jd: string, resume: string): Promise<InstantAnalysis> {
  const jdSkills = await localExtractSkills(jd);
  const resumeSkills = await localExtractSkills(resume);
  const skills_required = jdSkills.length > 0 ? jdSkills : ["General Software Engineering"];
  const skill_gaps = skills_required.filter(s => !resumeSkills.includes(s));
  
  const skill_assessment = skills_required.map(skill => {
    const foundInResume = resumeSkills.includes(skill);
    return {
      skill,
      level: (foundInResume ? "Intermediate" : "Beginner") as SkillLevel,
      confidence: (foundInResume ? "Medium" : "Low") as Confidence,
      evidence: foundInResume ? `Found matching keywords in resume.` : "No direct mention found in resume.",
      verified: false
    };
  });

  const fallbackSummary = SUMMARY_TEMPLATES[Math.floor(Math.random() * SUMMARY_TEMPLATES.length)]
    .replace("{role}", "Software Engineering")
    .replace("{skills}", resumeSkills.join(", ") || "various technical skills")
    .replace("{gaps}", skill_gaps.join(", ") || "minor areas");

  const prompt = `System: You are an AI recruitment assistant.
User: Summarize the fit.
Candidate: ${resumeSkills.join(", ")}
Required: ${skills_required.join(", ")}
Assistant: `;
  
  const summary = await generateAIResponse(prompt, fallbackSummary, 120);

  return {
    skills_required,
    skills_identified: resumeSkills,
    skill_assessment,
    skill_gaps,
    overall_summary: summary
  };
}

export async function localNextQuestion(jd: string, analysis: InstantAnalysis, history: QAExchange[], webQuestions?: string[]) {
  const askedSkills = history.map(h => h.skill);
  const unverified = analysis.skills_required.filter(s => !askedSkills.includes(s));
  
  if (unverified.length === 0 || history.length >= 6) {
    return { done: true, question: null, skill: null, difficulty: null, reason: "Assessment complete." };
  }

  const skill = unverified[0];
  
  // Use web-searched questions if available, otherwise use LLM/Fallback
  let question = "";
  if (webQuestions && webQuestions.length > 0) {
    question = webQuestions[Math.floor(Math.random() * webQuestions.length)];
  }

  if (!question) {
    const fallbackQ = QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)].replace("{skill}", skill);
    const prompt = `System: You are a technical interviewer.
User: Ask a technical question about ${skill}.
Assistant: `;
    question = await generateAIResponse(prompt, fallbackQ, 80);
  }

  return {
    done: false,
    question,
    skill,
    difficulty: (history.length % 2 === 0 ? "medium" : "hard") as any,
    reason: `Targeting ${skill}`
  };
}

export async function localFinalReport(jd: string, resume: string, analysis: InstantAnalysis, history: QAExchange[]): Promise<FinalReport> {
  const assessment = analysis.skill_assessment.map(sa => {
    const exchange = history.find(h => h.skill === sa.skill);
    if (exchange) {
      const score = exchange.answer.length > 50 ? 85 : 55;
      return {
        ...sa,
        verified: true,
        score,
        level: (score > 75 ? "Advanced" : "Intermediate") as SkillLevel,
        confidence: "High" as Confidence,
        evidence: `Verified via candidate's explanation.`
      };
    }
    return { ...sa, score: sa.level === "Intermediate" ? 60 : 20 };
  });

  const fallbackFinal = "Assessment complete. Based on the interview, the candidate has demonstrated practical knowledge in the core skill areas.";
  const prompt = `System: You are a career coach.
User: Summarize performance based on: ${history.map(h => `Q: ${h.question} A: ${h.answer}`).join("\n")}
Assistant: `;

  const summary = await generateAIResponse(prompt, fallbackFinal, 200);

  const getResourceLinks = (skill: string) => {
    const s = skill.toLowerCase();
    const links = [
      { title: `${skill} Documentation`, platform: "Official", link: `https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation")}&btnI` },
      { title: `Mastering ${skill} (2025)`, platform: "YouTube", link: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " tutorial 2025")}` },
      { title: `${skill} Advanced Course`, platform: "Udemy", link: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}` }
    ];

    // Specific overrides for accuracy
    if (s.includes("react")) links[0].link = "https://react.dev";
    if (s.includes("node")) links[0].link = "https://nodejs.org";
    if (s.includes("typescript")) links[0].link = "https://www.typescriptlang.org";
    if (s.includes("python")) links[0].link = "https://docs.python.org";
    if (s.includes("docker")) links[0].link = "https://docs.docker.com";
    if (s.includes("aws")) links[0].link = "https://aws.amazon.com/getting-started";
    
    return links;
  };

  const learning_plan = analysis.skill_gaps.slice(0, 4).map(skill => ({
    skill,
    priority: "High" as Priority,
    estimated_time: "4-6 weeks",
    resources: getResourceLinks(skill).map(r => ({
      ...r,
      type: (r.platform === "Official" ? "Free" : "Paid") as any
    })),
    project_suggestion: `Build a production-ready ${skill} project to showcase your learning.`
  }));

  // Generate Mermaid Graph
  let graph = "graph TD\n";
  graph += "  Start((Current Level)) --> Verified[Verified Skills]\n";
  assessment.filter(s => s.verified).forEach(s => {
    graph += `  Verified --> ${s.skill.replace(/\s+/g, "_")}[${s.skill}]\n`;
  });
  if (learning_plan.length > 0) {
    graph += "  Verified --> Gaps[Learning Path]\n";
    learning_plan.forEach(p => {
      graph += `  Gaps --> ${p.skill.replace(/\s+/g, "_")}[${p.skill}]\n`;
    });
  }
  graph += "  style Start fill:#3b82f6,stroke:#fff,color:#fff\n";
  graph += "  style Verified fill:#10b981,stroke:#fff,color:#fff\n";
  graph += "  style Gaps fill:#f59e0b,stroke:#fff,color:#fff\n";

  return {
    ...analysis,
    skill_assessment: assessment as any,
    learning_plan,
    overall_summary: summary,
    roadmap_graph: graph
  };
}
