import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, RotateCcw, ExternalLink, Trophy, Target, BookOpen, Sparkles } from "lucide-react";
import type { FinalReport } from "@/lib/types";
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
  },
});

interface Props {
  report: FinalReport;
  onRestart: () => void;
}

function RoadmapGraph({ definition }: { definition: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }, [definition]);

  return (
    <div
      className="mermaid w-full overflow-x-auto rounded-xl border border-border bg-background/50 p-6 shadow-inner"
      ref={containerRef}
    >
      {definition}
    </div>
  );
}

function levelColor(level: string) {
  switch (level) {
    case "Advanced":   return "bg-success/15 text-success border-success/30";
    case "Intermediate": return "bg-primary/15 text-primary border-primary/30";
    case "Beginner":   return "bg-warning/20 text-warning-foreground border-warning/30";
    default:           return "bg-muted text-muted-foreground border-border";
  }
}

function priorityColor(p: string) {
  switch (p) {
    case "High":   return "bg-destructive/15 text-destructive border-destructive/30";
    case "Medium": return "bg-warning/20 text-warning-foreground border-warning/30";
    default:       return "bg-muted text-muted-foreground border-border";
  }
}

export function FinalReportView({ report, onRestart }: Props) {
  const verifiedCount = report.skill_assessment.filter((s) => s.verified).length;
  const avgScore =
    report.skill_assessment.length > 0
      ? Math.round(
          report.skill_assessment.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            report.skill_assessment.length
        )
      : 0;

  async function downloadPDF() {
    // Dynamic import so it only loads on demand
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ── Helper: check if we need a new page ──────────────────────────────────
    function checkPage(neededHeight = 20) {
      if (y + neededHeight > pageH - 20) {
        doc.addPage();
        y = margin;
      }
    }

    // ── HEADER BANNER ────────────────────────────────────────────────────────
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageW, 48, "F");

    // Gradient overlay (simulate with a lighter rect)
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(pageW * 0.5, 0, pageW * 0.5, 48, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Skill Navigator", margin, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Personalised Skill Assessment & Learning Plan Report", margin, 27);

    // Date
    const now = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
    doc.setFontSize(9);
    doc.setTextColor(200, 220, 255);
    doc.text(`Generated on ${now}`, margin, 36);

    // Stats pills in header
    const stats = [
      { label: "Avg Score", value: `${avgScore}/100` },
      { label: "Verified", value: `${verifiedCount} skills` },
      { label: "Gaps Found", value: `${report.skill_gaps.length}` },
    ];
    stats.forEach((st, i) => {
      const x = pageW - margin - 108 + i * 38;
      doc.setFillColor(255, 255, 255, 0.2);
      doc.roundedRect(x, 10, 34, 28, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(st.value, x + 17, 22, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(200, 220, 255);
      doc.text(st.label.toUpperCase(), x + 17, 30, { align: "center" });
    });

    y = 58;

    // ── SUMMARY SECTION ──────────────────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Overall Assessment Summary", margin, y);
    y += 6;

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    doc.setFillColor(239, 246, 255);
    const summaryLines = doc.splitTextToSize(report.overall_summary, contentW - 8);
    const summaryH = summaryLines.length * 5 + 8;
    doc.roundedRect(margin, y, contentW, summaryH, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text(summaryLines, margin + 4, y + 6);
    y += summaryH + 10;

    // ── SKILL ASSESSMENT TABLE ───────────────────────────────────────────────
    checkPage(40);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Skill Assessment Results", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y + 2,
      margin: { left: margin, right: margin },
      head: [["Skill", "Level", "Score", "Verified", "Evidence"]],
      body: report.skill_assessment.map((s) => [
        s.skill,
        s.level,
        `${s.score ?? 0}/100`,
        s.verified ? "✓ Yes" : "—",
        s.evidence ?? "",
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 24 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: "auto" },
      },
      didDrawCell: (data) => {
        // Colour-code the Level column
        if (data.section === "body" && data.column.index === 1) {
          const level = data.cell.raw as string;
          if (level === "Advanced") doc.setTextColor(5, 150, 105);
          else if (level === "Intermediate") doc.setTextColor(37, 99, 235);
          else doc.setTextColor(202, 138, 4);
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // ── SKILL GAPS ───────────────────────────────────────────────────────────
    if (report.skill_gaps.length > 0) {
      checkPage(30);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Identified Skill Gaps", margin, y);
      y += 6;

      const gapCols = 3;
      const gapW = contentW / gapCols;
      report.skill_gaps.forEach((gap, i) => {
        checkPage(12);
        const col = i % gapCols;
        const gx = margin + col * gapW;
        if (col === 0 && i !== 0) y += 12;

        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        doc.roundedRect(gx + 2, y, gapW - 6, 10, 2, 2, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(153, 27, 27);
        doc.text(`⚠ ${gap}`, gx + 6, y + 6.5);
      });
      y += 20;
    }

    // ── PERSONALISED LEARNING PLAN ───────────────────────────────────────────
    if (report.learning_plan.length > 0) {
      checkPage(40);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Personalised Learning Plan", margin, y);
      y += 4;

      doc.setDrawColor(16, 185, 129);
      doc.line(margin, y + 1, margin + contentW, y + 1);
      y += 7;

      report.learning_plan.forEach((item, idx) => {
        checkPage(50);

        // Card bg
        doc.setFillColor(246, 254, 250);
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, y, contentW, 46, 4, 4, "FD");

        // Skill title + priority badge
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(4, 120, 87);
        doc.text(`${idx + 1}. ${item.skill}`, margin + 5, y + 8);

        // Priority pill
        const priX = margin + 5 + doc.getTextWidth(`${idx + 1}. ${item.skill}`) + 4;
        const isHigh = item.priority === "High";
        doc.setFillColor(isHigh ? 254 : 255, isHigh ? 226 : 243, isHigh ? 226 : 219);
        doc.roundedRect(priX, y + 2.5, 22, 7, 2, 2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(isHigh ? 153 : 180, isHigh ? 27 : 60, isHigh ? 27 : 20);
        doc.text(`${item.priority} Priority`, priX + 11, y + 7.5, { align: "center" });

        // Time estimate
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`⏱  ${item.estimated_time}`, pageW - margin - 5, y + 8, { align: "right" });

        // Project suggestion
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const projLines = doc.splitTextToSize(`💡 ${item.project_suggestion}`, contentW - 10);
        doc.text(projLines, margin + 5, y + 15);

        // Resources
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text("Resources:", margin + 5, y + 27);

        item.resources.forEach((r, ri) => {
          const rx = margin + 5 + ri * (contentW / 3);
          doc.setFillColor(235, 245, 255);
          doc.roundedRect(rx, y + 29, contentW / 3 - 4, 12, 2, 2, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(37, 99, 235);
          const titleLine = doc.splitTextToSize(r.title, contentW / 3 - 8);
          doc.text(titleLine[0], rx + 3, y + 35);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(r.platform, rx + 3, y + 39);
        });

        y += 52;
      });
    }

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageH - 14, pageW, 14, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Generated by Skill Navigator · AI-Powered Career Assessment", margin, pageH - 6);
      doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 6, { align: "right" });
    }

    doc.save("skill-navigator-report.pdf");
  }

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
            blue: current · green: verified · orange: growth path
          </p>
        </Card>
      )}

      {/* Skill Assessment */}
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
          <h3 className="font-semibold">Personalised Learning Plan</h3>
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

      {/* Actions */}
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
        <Button onClick={downloadPDF} className="gradient-primary text-primary-foreground shadow-elegant">
          <Download className="mr-2 h-4 w-4" />
          Download PDF Report
        </Button>
      </div>
    </div>
  );
}
