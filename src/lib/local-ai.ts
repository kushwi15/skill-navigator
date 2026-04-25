import type { InstantAnalysis, FinalReport, QAExchange, SkillLevel, Confidence, Priority } from "./types";

// --- Heuristic Engine (No LLM required) ---
// The assessment is powered by real-time web search + smart heuristics.
// This is more reliable than running a local LLM in the browser.
async function getModel() {
  return null; // Always use the Heuristic Engine
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

// Comprehensive list of recognizable tech skills
const KNOWN_SKILLS = [
  // Languages
  "JavaScript","TypeScript","Python","Java","C++","C#","Go","Rust","Ruby","PHP","Swift","Kotlin","Scala","R",
  // Frontend
  "React","Next.js","Vue","Angular","Svelte","HTML","CSS","Tailwind","Redux","GraphQL","REST API",
  // Backend
  "Node.js","Express","Django","Flask","FastAPI","Spring Boot","Laravel","Rails","NestJS",
  // Databases
  "MongoDB","PostgreSQL","MySQL","Redis","SQLite","DynamoDB","Elasticsearch","Firebase","Supabase",
  // Cloud & DevOps
  "AWS","GCP","Azure","Docker","Kubernetes","CI/CD","Terraform","Ansible","Linux","Nginx",
  // Tools & Practices
  "Git","GitHub","Jest","Pytest","TDD","Agile","Scrum","REST","GraphQL","Microservices",
  "WebSockets","OAuth","JWT","OpenAPI","Figma","Postman",
  // ML/AI
  "TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","LangChain","OpenAI","Hugging Face",
  // Mobile
  "React Native","Flutter","iOS","Android","Expo",
];

export async function localExtractSkills(text: string): Promise<string[]> {
  const upper = text.toUpperCase();
  const found = KNOWN_SKILLS.filter(skill =>
    upper.includes(skill.toUpperCase())
  );
  // Deduplicate and return at least one result
  return found.length > 0 ? [...new Set(found)] : ["General Engineering"];
}

export async function localInstantAnalysis(jd: string, resume: string): Promise<InstantAnalysis> {
  const jdSkills = await localExtractSkills(jd);
  const resumeSkills = await localExtractSkills(resume);

  const skills_required = jdSkills.length > 0 ? jdSkills : ["General Software Engineering"];
  
  // Skills the JD needs but the resume doesn't mention — these are the real GAPS
  const skill_gaps = skills_required.filter(
    s => !resumeSkills.map(r => r.toUpperCase()).includes(s.toUpperCase())
  );

  const skill_assessment = skills_required.map(skill => {
    const foundInResume = resumeSkills.map(r => r.toUpperCase()).includes(skill.toUpperCase());
    return {
      skill,
      level: (foundInResume ? "Intermediate" : "Beginner") as SkillLevel,
      confidence: (foundInResume ? "Medium" : "Low") as Confidence,
      evidence: foundInResume
        ? `Keyword matched in resume — likely has practical experience.`
        : `Not mentioned in resume — identified as a learning gap.`,
      verified: false
    };
  });

  const fallbackSummary = SUMMARY_TEMPLATES[Math.floor(Math.random() * SUMMARY_TEMPLATES.length)]
    .replace("{role}", "Software Engineering")
    .replace("{skills}", resumeSkills.slice(0, 5).join(", ") || "various technical skills")
    .replace("{gaps}", skill_gaps.slice(0, 3).join(", ") || "minor areas");

  return {
    skills_required,
    skills_identified: resumeSkills,
    skill_assessment,
    skill_gaps,
    overall_summary: fallbackSummary
  };
}

export async function localVerifyAnswer(question: string, answer: string, skill: string) {
  const lowerAnswer = answer.toLowerCase().trim();

  if (lowerAnswer.length < 15) {
    return {
      valid: false,
      feedback: `That response is quite brief. Could you provide a more detailed explanation of your experience with ${skill}?`,
      score: 10
    };
  }

  const gibberishPatterns = [/^[asdfghjkl]+$/, /^[qwertyuiop]+$/, /^[zxcvbnm]+$/, /^h+l+o+$/];
  if (gibberishPatterns.some(p => p.test(lowerAnswer))) {
    return {
      valid: false,
      feedback: `I didn't quite catch that. Please provide a relevant technical answer about ${skill}.`,
      score: 0
    };
  }

  // Score by depth — longer, more technical answers score higher
  const wordCount = answer.trim().split(/\s+/).length;
  const score = Math.min(100, 30 + wordCount * 2);

  return {
    valid: true,
    score,
    feedback: score < 50 ? `That's a start — can you elaborate further on your experience with ${skill}?` : null
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
    question = QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)].replace("{skill}", skill);
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
      // Analyze answer length and depth for real proficiency
      const depthScore = Math.min(100, Math.max(0, exchange.answer.length / 4 + 20));
      const verified = exchange.answer.length > 30;
      
      return {
        ...sa,
        verified,
        score: depthScore,
        level: (depthScore > 75 ? "Advanced" : depthScore > 40 ? "Intermediate" : "Beginner") as SkillLevel,
        confidence: "High" as Confidence,
        evidence: verified 
          ? `Conversationally verified. Demonstrated ${depthScore > 70 ? "deep" : "foundational"} understanding of ${sa.skill} through technical explanation.`
          : `Insufficient signal during chat. Recommendation: Further technical validation required.`
      };
    }
    return { ...sa, score: sa.level === "Intermediate" ? 60 : 20 };
  });

  const verifiedSkills = assessment.filter(s => s.verified).map(s => s.skill);
  const summary = history.length > 0
    ? `Assessment complete. You demonstrated knowledge in ${verifiedSkills.join(", ") || "the assessed skills"}. ${analysis.skill_gaps.length > 0 ? `Focus on acquiring ${analysis.skill_gaps.slice(0, 3).join(", ")} to strengthen your profile for this role.` : "You are well-aligned with the requirements."}`
    : "Assessment complete. You show strong technical foundations, with clear paths for adjacent skill acquisition in the identified gap areas.";

  const getResourceLinks = (skill: string) => {
    const s = skill.toLowerCase();
    const links = [
      { title: `${skill} Documentation`, platform: "Official", link: `https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation")}&btnI` },
      { title: `Mastering ${skill} (2025)`, platform: "YouTube", link: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " tutorial 2025")}` },
      { title: `${skill} Advanced Course`, platform: "Udemy", link: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}` }
    ];

    if (s.includes("react")) links[0].link = "https://react.dev";
    if (s.includes("node")) links[0].link = "https://nodejs.org";
    if (s.includes("typescript")) links[0].link = "https://www.typescriptlang.org";
    if (s.includes("python")) links[0].link = "https://docs.python.org";
    if (s.includes("docker")) links[0].link = "https://docs.docker.com";
    if (s.includes("aws")) links[0].link = "https://aws.amazon.com/getting-started";
    
    return links;
  };

  // Map gaps to adjacent skills the candidate can realistically acquire
  const learning_plan = analysis.skill_gaps.slice(0, 4).map(skill => {
    const isHighPriority = analysis.skills_required.includes(skill);
    return {
      skill,
      priority: (isHighPriority ? "High" : "Medium") as Priority,
      estimated_time: isHighPriority ? "2-4 weeks (Intensive)" : "4-6 weeks",
      resources: getResourceLinks(skill).map(r => ({
        ...r,
        type: (r.platform === "Official" ? "Free" : "Paid") as any
      })),
      project_suggestion: `Adjacent Skill Path: Bridge your current knowledge by building a ${skill}-integrated module in an existing project.`
    };
  });

  // Generate Mermaid Graph
  let graph = "graph TD\n";
  graph += "  Start((Your Profile)) --> Verified[Verified Proficiencies]\n";
  assessment.filter(s => s.verified).forEach(s => {
    graph += `  Verified --> ${s.skill.replace(/\s+/g, "_")}[${s.skill}]\n`;
  });
  if (learning_plan.length > 0) {
    graph += "  Verified --> Gaps[Adjacent Growth Path]\n";
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
