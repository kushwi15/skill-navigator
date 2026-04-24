export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Unverified";
export type Confidence = "Low" | "Medium" | "High";
export type Priority = "High" | "Medium" | "Low";

export interface InstantAnalysis {
  skills_required: string[];
  skills_identified: string[];
  skill_assessment: Array<{
    skill: string;
    level: SkillLevel;
    confidence: Confidence;
    evidence: string;
    verified: boolean;
  }>;
  skill_gaps: string[];
  overall_summary: string;
}

export interface AssessmentQuestion {
  skill: string;
  question: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QAExchange {
  skill: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface FinalReport {
  skills_required: string[];
  skills_identified: string[];
  skill_assessment: Array<{
    skill: string;
    level: SkillLevel;
    score: number; // 0-100
    confidence: Confidence;
    evidence: string;
    verified: boolean;
  }>;
  skill_gaps: string[];
  learning_plan: Array<{
    skill: string;
    priority: Priority;
    estimated_time: string;
    resources: Array<{
      title: string;
      type: "Free" | "Paid";
      platform: string;
      link: string;
    }>;
    project_suggestion: string;
  }>;
  overall_summary: string;
}
