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
      await new Promise(resolve => setTimeout(resolve, 800));
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

  function downloadTxt() {
    if (!enhanced) return;
    const blob = new Blob([enhanced], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enhanced_resume_navigator.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-soft">
      <div className="flex items-center justify-between border-b border-primary/10 bg-primary/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-primary">AI Resume Enhancer</h3>
        </div>
        {!enhanced && (
          <Badge variant="outline" className="border-primary/30 bg-background/50 text-[10px] uppercase">
            Beta
          </Badge>
        )}
      </div>

      <div className="p-5">
        {!enhanced ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on the JD and your current resume, our agent can generate a 
              <span className="font-medium text-foreground"> realistic, JD-targeted version</span> of your resume 
              featuring metric-driven achievements and growth roadmaps.
            </p>
            <Button 
              onClick={handleEnhance} 
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground shadow-elegant"
            >
              {loading ? "Analyzing Gaps..." : "Enhance My Resume →"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={downloadTxt} className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded-md border border-border bg-background p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {enhanced}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-xs text-success-foreground border border-success/20">
              <FileCheck className="h-4 w-4 text-success" />
              This version includes metric-driven bullets for your "Impact Highlights" section.
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
