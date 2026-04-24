import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import type { InstantAnalysis } from "@/lib/types";

interface Props {
  analysis: InstantAnalysis;
  onStartChat: () => void;
  onSkipToReport: () => void;
  loading?: boolean;
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

export function InstantResults({ analysis, onStartChat, onSkipToReport, loading }: Props) {
  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-soft">
        <h3 className="mb-2 text-lg font-semibold">Initial Read</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {analysis.overall_summary}
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h3 className="font-semibold">Skills Identified</h3>
            <Badge variant="secondary">{analysis.skills_identified.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.skills_identified.map((s) => (
              <Badge key={s} variant="outline" className="border-success/30 bg-success/10 text-success">
                {s}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold">Skill Gaps</h3>
            <Badge variant="secondary">{analysis.skill_gaps.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.skill_gaps.length === 0 ? (
              <span className="text-sm text-muted-foreground">No major gaps detected.</span>
            ) : (
              analysis.skill_gaps.map((s) => (
                <Badge key={s} variant="outline" className="border-warning/30 bg-warning/15 text-foreground">
                  {s}
                </Badge>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-soft">
        <h3 className="mb-4 font-semibold">Preliminary Skill Map</h3>
        <div className="space-y-2">
          {analysis.skill_assessment.map((s) => (
            <div
              key={s.skill}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.skill}</div>
                <div className="truncate text-xs text-muted-foreground">{s.evidence}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${levelColor(s.level)}`}>
                  {s.level}
                </span>
                <span className="text-xs text-muted-foreground">conf: {s.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={onSkipToReport} disabled={loading}>
          Skip & generate report
        </Button>
        <Button
          onClick={onStartChat}
          disabled={loading}
          className="gradient-primary text-primary-foreground shadow-elegant transition-smooth hover:shadow-glow"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Start Chat Assessment
        </Button>
      </div>
    </div>
  );
}
