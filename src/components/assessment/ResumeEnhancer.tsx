import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Check, Download, FileText } from "lucide-react";
import { localEnhanceResume } from "@/lib/local-ai";
import { toast } from "sonner";
import type { InstantAnalysis } from "@/lib/types";

interface Props {
  jd: string;
  resume: string;
  analysis: InstantAnalysis;
}

export function ResumeEnhancer({ jd, resume, analysis }: Props) {
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleEnhance() {
    setLoading(true);
    try {
      // Small delay to simulate "thinking" for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));
      const result = localEnhanceResume(jd, resume, analysis);
      setEnhanced(result);
      toast.success("Resume enhanced successfully!");
    } catch (e) {
      toast.error("Failed to enhance resume");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!enhanced) return;
    navigator.clipboard.writeText(enhanced);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadPDF() {
    if (!enhanced) return;
    const { default: jsPDF } = await import("jspdf");
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const lines = enhanced.split("\n");
    const margin = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    doc.setFont("helvetica", "bold");
    
    // 1. Process Header (First 3-4 lines usually)
    const name = lines[0];
    const title = lines[1];
    const contact = lines[2];

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue primary
    doc.text(name, pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(title, pageWidth / 2, y, { align: "center" });
    y += 7;

    if (contact && contact.includes("|")) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(contact, pageWidth / 2, y, { align: "center" });
      y += 10;
    }

    // Horizontal line after header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // 2. Process Content
    const bodyLines = lines.slice(3);
    
    bodyLines.forEach((line) => {
      const t = line.trim();
      if (!t) {
        y += 4;
        return;
      }

      // 1. Detect and skip garbage/artifact lines (less than 30% alphanumeric chars)
      const alphanumCount = (t.match(/[a-zA-Z0-9]/g) || []).length;
      if (alphanumCount / t.length < 0.3) return;

      if (y > pageHeight - margin - 12) {
        doc.addPage();
        y = margin + 5;
      }

      // 2. Detect Section Headers (ALL CAPS lines)
      const isHeader = t === t.toUpperCase() && t.length > 3 && !t.includes("•") && !t.includes("[") && !t.startsWith("OPTIMIZED");

      if (isHeader) {
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text(t, margin, y);
        
        // Compact accent line under header
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.6);
        doc.line(margin, y + 1.5, margin + 12, y + 1.5);
        
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
      } else if (t.startsWith("•") || t.startsWith("-")) {
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const bulletText = t.replace(/^[•\-]\s*/, "");
        const splitText = doc.splitTextToSize("•  " + bulletText, contentWidth - 5);
        doc.text(splitText, margin + 3, y);
        y += splitText.length * 5 + 1;
      } else if (t.includes(":") && t.length < 120) { // Likely a skill label: content
        doc.setFontSize(9.5);
        const parts = t.split(":");
        const label = parts[0] + ":";
        const val = parts.slice(1).join(":").trim();
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(label, margin, y);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const splitVal = doc.splitTextToSize(val, contentWidth - 40);
        doc.text(splitVal, margin + 40, y);
        y += Math.max(6, splitVal.length * 5);
      } else {
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        const splitText = doc.splitTextToSize(t, contentWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 5 + 2;
      }
    });

    doc.save("enhanced_resume.pdf");
    toast.success("Professional PDF Generated");
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-primary/10 bg-primary/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-bold text-primary">Targeted Resume Enhancer</h3>
        </div>
        {!enhanced ? (
          <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
            Heuristic AI
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-success/20 text-success border-none text-[10px] uppercase font-bold tracking-wider">
            Optimized
          </Badge>
        )}
      </div>

      <div className="p-6">
        {!enhanced ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-background/60 p-4 border border-primary/10">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Our agent will rewrite your resume sections to align with the 
                <span className="font-bold text-foreground"> specific requirements </span> of the job description.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Metric-driven impact highlights",
                  "Professional summary optimization",
                  "Skill prioritization & gap notes",
                  "UPSKILLING roadmap integration"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-primary" /> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              onClick={handleEnhance} 
              disabled={loading}
              className="w-full h-11 gradient-primary text-primary-foreground shadow-elegant hover:scale-[1.02] transition-transform"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Rewriting Sections...
                </div>
              ) : "Generate Enhanced Resume"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enhanced Version Preview</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 gap-2 text-xs">
                  {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPDF} className="h-8 gap-2 text-xs border-primary/20 hover:bg-primary/5">
                  <Download className="h-3 w-3 text-primary" />
                  Download PDF
                </Button>
              </div>
            </div>
            <textarea
              value={enhanced}
              onChange={(e) => setEnhanced(e.target.value)}
              className="min-h-[350px] w-full resize-none rounded-xl border border-border bg-background p-5 font-mono text-[10px] leading-relaxed shadow-inner focus:outline-none focus:ring-1 focus:ring-primary/30 selection:bg-primary/20"
              spellCheck={false}
            />
            <div className="flex items-start gap-3 rounded-xl bg-success/5 p-4 text-[11px] text-success-foreground border border-success/20">
              <div className="mt-0.5 rounded-full bg-success/20 p-1">
                <FileCheck className="h-3 w-3 text-success" />
              </div>
              <p className="leading-relaxed">
                <span className="font-bold">Production Ready:</span> This version prioritizes keywords found in the JD and includes a "Upskilling Roadmap" section to show proactive growth in missing areas.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function FileCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
