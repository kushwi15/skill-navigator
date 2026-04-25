import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { localInstantAnalysis, localFinalReport } from "@/lib/local-ai";
import { UploadStep } from "@/components/assessment/UploadStep";
import { InstantResults } from "@/components/assessment/InstantResults";
import { ChatAssessment } from "@/components/assessment/ChatAssessment";
import { FinalReportView } from "@/components/assessment/FinalReportView";
import { Sparkles, Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { InstantAnalysis, FinalReport, QAExchange } from "@/lib/types";
import { hashString } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type Step = "upload" | "instant" | "chat" | "report";

function Index() {
  const [step, setStep] = useState<Step>("upload");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [analysis, setAnalysis] = useState<InstantAnalysis | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runInstant = localInstantAnalysis;
  const runFinal = localFinalReport;

  async function handleUpload(jdText: string, resumeText: string) {
    setLoading(true);
    setJd(jdText);
    setResume(resumeText);

    // Caching logic
    const cacheKey = `analysis_${hashString(jdText + resumeText)}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as InstantAnalysis;
        setAnalysis(parsed);
        setStep("instant");
        setLoading(false);
        toast.success("Loaded from cache");
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      const res = await runInstant(jdText, resumeText);
      setAnalysis(res);
      localStorage.setItem(cacheKey, JSON.stringify(res));
      setStep("instant");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function handleReportComplete(r: FinalReport, _history: QAExchange[]) {
    setReport(r);
    setStep("report");
  }

  async function skipToReport() {
    if (!analysis) return;
    setLoading(true);
    try {
      const r = await runFinal(jd, resume, analysis, []);
      setReport(r);
      setStep("report");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep("upload");
    setAnalysis(null);
    setReport(null);
  }

  return (
    <div className="bg-hero-mesh min-h-screen">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold tracking-tight">SkillScope</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                AI Assessment Agent
              </div>
            </div>
          </div>
          <Stepper current={step} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {step === "upload" && (
          <>
            <div className="mb-10 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Powered by adaptive AI questioning
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Know exactly <span className="text-gradient">where you stand</span> for any role.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Paste a job description and upload your resume. SkillScope extracts required skills,
                validates your level through an adaptive chat, and builds a personalized roadmap.
              </p>
            </div>
            <UploadStep onSubmit={handleUpload} loading={loading} />
          </>
        )}

        {step === "instant" && analysis && (
          <>
            <div className="flex items-center justify-between">
              <SectionHeader
                title="Initial Analysis"
                subtitle="Resume vs job description. Skills are unverified until validated through chat."
              />
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Upload
              </Button>
            </div>
            <InstantResults
              analysis={analysis}
              onStartChat={() => setStep("chat")}
              onSkipToReport={skipToReport}
              loading={loading}
            />
          </>
        )}

        {step === "chat" && analysis && (
          <>
            <div className="flex items-center justify-between">
              <SectionHeader
                title="Adaptive Skill Assessment"
                subtitle="Answer concretely. The agent will adapt difficulty and stop when it has enough signal."
              />
              <Button variant="ghost" size="sm" onClick={() => setStep("instant")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Analysis
              </Button>
            </div>
            <ChatAssessment
              jobDescription={jd}
              resume={resume}
              analysis={analysis}
              onComplete={handleReportComplete}
            />
          </>
        )}

        {step === "report" && report && (
          <>
            <SectionHeader title="Your Report" subtitle="Verified levels, gaps, and a realistic learning plan." />
            <FinalReportView report={report} onRestart={restart} />
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        SkillScope · Honest skill mapping for ambitious careers
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "instant", label: "Analyze" },
  { id: "chat", label: "Assess" },
  { id: "report", label: "Report" },
];

function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {STEPS.map((s, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-smooth ${
                active
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : done
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
