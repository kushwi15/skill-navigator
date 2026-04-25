# 🧭 Skill Navigator — AI Career Assessment Agent

**Skill Navigator** is a high-performance, client-side application designed to bridge the gap between your current expertise and your dream job. Using a sophisticated heuristic engine, it analyzes resumes against job descriptions (JD), identifies critical skill gaps, and provides an interactive platform for proficiency validation and personalized growth.

---

## 🚀 Key Features

### 🔍 Instant Skill Analysis
- **Parser**: Client-side extraction of skills from PDF, DOCX, and TXT files.
- **Match Engine**: Semantic keyword matching against a curated library of 100+ industry-standard technologies.
- **Gap Identification**: Highlights exactly what the employer wants that your resume is missing.

### 📝 Realistic Resume Enhancement
- **Targeted Rewriting**: Generates a tailored resume section with high-impact, metric-driven achievements (e.g., *"Optimized p99 latency by 80ms"*).
- **Experience Detection**: Automatically calculates total Years of Experience (YoE) to provide a professional summary.
- **Development Roadmap**: Transparently highlights skills you are currently upskilling in to show proactive growth.

### 💬 Interactive Technical Assessment
- **Adaptive QA**: A conversational agent that targets unverified skills with technical questions.
- **Depth Analysis**: Evaluates response quality and technicality to assign "Advanced", "Intermediate", or "Beginner" levels.
- **Feedback Loop**: Provides instant feedback on answer brevity or relevance.

### 📊 Professional Reporting
- **Personalized Learning Plan**: Curated resource links (Docs, Courses, YouTube) for identified gaps.
- **Growth Roadmaps**: Visualizes your career progression using **Mermaid.js** diagrams.
- **Export**: Generate structured, branded PDF reports for offline use.

---

## 🛠️ Technology Stack

- **Frontend**: [TanStack Start](https://tanstack.com/start) (Next-gen React Framework)
- **Styling**: Tailwind CSS + Shadcn UI (Premium Glassmorphism Design)
- **Reporting**: jsPDF & jspdf-autotable
- **Parsing**: PDF.js (PDF) & Mammoth (DOCX)
- **Visualization**: Mermaid.js
- **Logic**: Pure TypeScript Heuristic Engine (Offline-ready, Privacy-first)

---

## 🚦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd skill-navigator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to see the app in action.

---

## 📂 Project Structure

```text
skill-navigator/
├── src/
│   ├── components/       # Reusable UI components (Assessment flow, UI kit)
│   ├── lib/              
│   │   ├── local-ai.ts   # Core Heuristic Engine (Logic layer)
│   │   ├── types.ts      # TypeScript interfaces
│   │   └── utils.ts      # UI helper functions
│   ├── routes/           # TanStack Start routing
│   └── styles/           # Tailwind configuration and global styles
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

---

## 🧠 Core Engine: Why No LLM?

Traditional browser-based LLMs are often large (GBs of data) and unstable. **Skill Navigator** uses a **Heuristic Engine** designed for:
1. **Zero Latency**: Instant results with no API calls or model downloads.
2. **Total Privacy**: Your resume and job descriptions never leave your machine.
3. **Deterministic Quality**: Achievement bullets and questions are curated for maximum professional impact, avoiding "AI hallucinations."

---

## 🛣️ Future Roadmap
- [ ] **Multi-Role Support**: Specialized engines for Product Management, Design, and Marketing.
- [ ] **Direct Job Matching**: Integration with job board APIs to find roles based on your verified map.
- [ ] **Local Storage Persistence**: Save your assessment progress across sessions.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

Developed with ❤️ for the future of career engineering.
