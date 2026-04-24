import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, FileCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { nextQuestion, finalReport } from "@/lib/assessment.functions";
import { toast } from "sonner";
import type { QAExchange, FinalReport, InstantAnalysis } from "@/lib/types";

interface Props {
  jobDescription: string;
  resume: string;
  analysis: InstantAnalysis;
  onComplete: (report: FinalReport, history: QAExchange[]) => void;
}

interface CurrentQ {
  question: string;
  skill: string;
  difficulty: "easy" | "medium" | "hard";
}

export function ChatAssessment({ jobDescription, resume, analysis, onComplete }: Props) {
  const [history, setHistory] = useState<QAExchange[]>([]);
  const [currentQ, setCurrentQ] = useState<CurrentQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [loadingQ, setLoadingQ] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const askedOnce = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const askNext = useServerFn(nextQuestion);
  const finalize = useServerFn(finalReport);

  async function fetchNext(updatedHistory: QAExchange[]) {
    setLoadingQ(true);
    try {
      const res = (await askNext({
        data: { jobDescription, analysis, history: updatedHistory },
      })) as {
        done: boolean;
        question: string | null;
        skill: string | null;
        difficulty: "easy" | "medium" | "hard" | null;
      };
      if (res.done || !res.question || !res.skill || !res.difficulty) {
        await generateReport(updatedHistory);
        return;
      }
      setCurrentQ({ question: res.question, skill: res.skill, difficulty: res.difficulty });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load next question");
    } finally {
      setLoadingQ(false);
    }
  }

  async function generateReport(finalHistory: QAExchange[]) {
    setGeneratingReport(true);
    try {
      const report = (await finalize({
        data: { jobDescription, resume, analysis, history: finalHistory },
      })) as FinalReport;
      onComplete(report, finalHistory);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
      setGeneratingReport(false);
    }
  }

  useEffect(() => {
    if (askedOnce.current) return;
    askedOnce.current = true;
    void fetchNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, currentQ]);

  function submitAnswer() {
    if (!currentQ || !answer.trim()) return;
    const next: QAExchange = {
      skill: currentQ.skill,
      question: currentQ.question,
      answer: answer.trim(),
      difficulty: currentQ.difficulty,
    };
    const updated = [...history, next];
    setHistory(updated);
    setAnswer("");
    setCurrentQ(null);
    void fetchNext(updated);
  }

  function endNow() {
    void generateReport(history);
  }

  if (generatingReport) {
    return (
      <Card className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-12 shadow-soft">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <Sparkles className="relative h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Generating your final report…</h3>
        <p className="text-sm text-muted-foreground">Synthesizing answers, gaps, and a learning roadmap.</p>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[500px] flex-col overflow-hidden p-0 shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="text-sm font-medium">Adaptive Assessment</span>
          <Badge variant="secondary">{history.length} answered</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={endNow} disabled={history.length === 0}>
          <FileCheck className="mr-1.5 h-4 w-4" />
          Finish & report
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5" style={{ maxHeight: "55vh" }}>
        {history.map((h, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                AI
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {h.skill}
                  </Badge>
                  <span className="text-xs uppercase text-muted-foreground">{h.difficulty}</span>
                </div>
                <p className="leading-relaxed">{h.question}</p>
              </div>
            </div>
            <div className="flex items-start justify-end gap-3">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground whitespace-pre-wrap">
                {h.answer}
              </div>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                You
              </div>
            </div>
          </div>
        ))}

        {currentQ && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
              AI
            </div>
            <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentQ.skill}
                </Badge>
                <span className="text-xs uppercase text-muted-foreground">{currentQ.difficulty}</span>
              </div>
              <p className="leading-relaxed">{currentQ.question}</p>
            </div>
          </div>
        )}

        {loadingQ && !currentQ && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
              AI
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitAnswer();
              }
            }}
            placeholder={
              currentQ
                ? "Type your answer… (⌘/Ctrl + Enter to send)"
                : loadingQ
                  ? "Loading next question…"
                  : "Waiting…"
            }
            disabled={!currentQ || loadingQ}
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={submitAnswer}
            disabled={!currentQ || !answer.trim() || loadingQ}
            className="gradient-primary self-stretch px-4 text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Answer naturally. The AI adapts difficulty based on your responses.
        </p>
      </div>
    </Card>
  );
}
