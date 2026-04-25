import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, RotateCcw, ExternalLink, Trophy, Target, BookOpen, Sparkles } from "lucide-react";
import type { FinalReport } from "@/lib/types";

interface Props {
  report: FinalReport;
  onRestart: () => void;
}

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: true,
  theme: "base",
  themeVariables: {
    primaryColor: "#3b82f6",
    primaryTextColor: "#fff",
    primaryBorderColor: "#2563eb",
    lineColor: "#64748b",
    secondaryColor: "#10b981",
    tertiaryColor: "#f59e0b",
  }
});

function RoadmapGraph({ definition }: { definition: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }, [definition]);

  return (
    <div className="mermaid w-full overflow-x-auto rounded-xl border border-border bg-background/50 p-6 shadow-inner" ref={containerRef}>
      {definition}
    </div>
  );
}

function levelColor(level: string) {
  switch (level) {
    case "Advanced":
      return "bg-success/15 text-success border-success/30";
    case "Intermediate":
      return "bg-primary/15 text-primary border-primary/30";
    case "Beginner":
      return "bg-warning/20 text-warning-foreground border-warning/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function priorityColor(p: string) {
  switch (p) {
    case "High":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "Medium":
      return "bg-warning/20 text-warning-foreground border-warning/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function FinalReportView({ report, onRestart }: Props) {
  function downloadJSON() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skill-assessment-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const verifiedCount = report.skill_assessment.filter((s) => s.verified).length;
  const avgScore =
    report.skill_assessment.length > 0
      ? Math.round(
          report.skill_assessment.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            report.skill_assessment.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden p-0 shadow-elegant">
        <div className="gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7" />
            <h2 className="text-2xl font-bold">Final Skill Report</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed opacity-95">
            {report.overall_summary}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-background/15 p-3 backdrop-blur">
              <div className="text-2xl font-bold">{avgScore}</div>
              <div className="text-xs uppercase opacity-80">avg score</div>
            </div>
            <div className="rounded-lg bg-background/15 p-3 backdrop-blur">
              <div className="text-2xl font-bold">{verifiedCount}</div>
              <div className="text-xs uppercase opacity-80">verified</div>
            </div>
            <div className="rounded-lg bg-background/15 p-3 backdrop-blur">
              <div className="text-2xl font-bold">{report.skill_gaps.length}</div>
              <div className="text-xs uppercase opacity-80">gaps</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Visual Roadmap */}
      {report.roadmap_graph && (
        <Card className="p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Visual Skill Roadmap</h3>
          </div>
          <RoadmapGraph definition={report.roadmap_graph} />
          <p className="mt-3 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
            blue: current · green: verified · orange: path
          </p>
        </Card>
      )}

      {/* Skill assessment */}
      <Card className="p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Skill Assessment</h3>
        </div>
        <div className="space-y-3">
          {report.skill_assessment.map((s) => (
            <div key={s.skill} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.skill}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${levelColor(s.level)}`}>
                    {s.level}
                  </span>
                  {s.verified && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ verified
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-semibold tabular-nums">{s.score}/100</div>
              </div>
              <Progress value={s.score} className="h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">{s.evidence}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Learning Plan */}
      <Card className="p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Personalized Learning Plan</h3>
        </div>
        {report.learning_plan.length === 0 ? (
          <p className="text-sm text-muted-foreground">No major gaps — you're well-aligned with this role.</p>
        ) : (
          <div className="space-y-4">
            {report.learning_plan.map((item) => (
              <div key={item.skill} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.skill}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityColor(item.priority)}`}>
                      {item.priority} priority
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">⏱ {item.estimated_time}</span>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Project idea: </span>
                  {item.project_suggestion}
                </p>
                <div className="space-y-1.5">
                  {item.resources.map((r, i) => (
                    <a
                      key={i}
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm transition-smooth hover:border-primary/40 hover:bg-secondary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.platform}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          r.type === "Free"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-primary/30 bg-primary/10 text-primary"
                        }
                      >
                        {r.type}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-smooth group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          New assessment
        </Button>
        <Button onClick={downloadJSON} className="gradient-primary text-primary-foreground shadow-elegant">
          <Download className="mr-2 h-4 w-4" />
          Download JSON Report
        </Button>
      </div>
    </div>
  );
}
