import { createFileRoute } from "@tanstack/react-router";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const Route = createFileRoute("/api/parse-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }
          if (file.size > 10 * 1024 * 1024) {
            return Response.json({ error: "File too large (max 10MB)" }, { status: 413 });
          }

          const name = file.name.toLowerCase();
          const buf = new Uint8Array(await file.arrayBuffer());
          let text = "";

          if (name.endsWith(".pdf") || file.type === "application/pdf") {
            const pdf = await getDocumentProxy(buf);
            const result = await extractText(pdf, { mergePages: true });
            text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
          } else if (name.endsWith(".docx")) {
            const result = await mammoth.extractRawText({
              buffer: Buffer.from(buf),
            });
            text = result.value;
          } else if (name.endsWith(".txt") || file.type === "text/plain") {
            text = new TextDecoder().decode(buf);
          } else {
            return Response.json(
              { error: "Unsupported file type. Use PDF, DOCX, or TXT." },
              { status: 415 }
            );
          }

          text = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

          if (text.length < 30) {
            return Response.json(
              { error: "Could not extract meaningful text from file." },
              { status: 422 }
            );
          }

          return Response.json({ text });
        } catch (e) {
          console.error("parse-resume error:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: `Failed to parse: ${msg}` }, { status: 500 });
        }
      },
    },
  },
});
