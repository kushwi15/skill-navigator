import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Props {
  onSubmit: (jd: string, resume: string) => void;
  loading?: boolean;
}

export function UploadStep({ onSubmit, loading }: Props) {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParsing(true);
    const name = file.name.toLowerCase();
    
    try {
      if (name.endsWith(".pdf")) {
        // Load PDF.js only when needed in the browser
        const pdfjs = await import("pdfjs-dist");
        // Use the local bundled worker instead of a CDN
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          verbosity: 0 // Silence font warnings (TT: undefined function: 32)
        });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }
        
        setResume(fullText.trim());
        setFilename(file.name);
        toast.success(`Extracted text from ${file.name}`);
      } else if (name.endsWith(".docx")) {
        // Load mammoth for Word files on the client
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        setResume(result.value.trim());
        setFilename(file.name);
        toast.success(`Extracted text from ${file.name}`);
      } else if (name.endsWith(".txt") || file.type === "text/plain") {
        const text = await file.text();
        setResume(text.trim());
        setFilename(file.name);
        toast.success(`Extracted text from ${file.name}`);
      } else {
        throw new Error(`Unsupported file type: ${name}. Use PDF, DOCX, or TXT.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  function clearFile() {
    setResume("");
    setFilename(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canSubmit = jd.trim().length >= 20 && resume.trim().length >= 20 && !loading;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 shadow-soft">
        <Label htmlFor="jd" className="text-base font-semibold">
          Job Description
        </Label>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Paste the role you're targeting.
        </p>
        <Textarea
          id="jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="e.g. Senior React Developer with 3+ years experience in Next.js, TypeScript, GraphQL…"
          className="min-h-[260px] resize-y font-mono text-sm"
        />
        <div className="mt-2 text-right text-xs text-muted-foreground">
          {jd.length} chars
        </div>
      </Card>

      <Card className="p-6 shadow-soft">
        <Label className="text-base font-semibold">Your Resume</Label>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Upload a PDF, DOCX, or TXT file — or paste below.
        </p>

        <div className="mb-3">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {filename ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">{filename}</span>
              <button
                type="button"
                onClick={clearFile}
                className="text-muted-foreground transition-smooth hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={parsing}
              onClick={() => inputRef.current?.click()}
            >
              {parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF / DOCX / TXT
                </>
              )}
            </Button>
          )}
        </div>

        <Textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="…or paste resume text here"
          className="min-h-[200px] resize-y font-mono text-sm"
        />
        <div className="mt-2 text-right text-xs text-muted-foreground">
          {resume.length} chars
        </div>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button
          size="lg"
          disabled={!canSubmit}
          onClick={() => onSubmit(jd.trim(), resume.trim())}
          className="gradient-primary text-primary-foreground shadow-elegant transition-smooth hover:shadow-glow"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Run Instant Analysis →"
          )}
        </Button>
      </div>
    </div>
  );
}
