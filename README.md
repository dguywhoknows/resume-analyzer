# resume-analyzer

[![tests](https://github.com/dguywhoknows/resume-analyzer/actions/workflows/tests.yml/badge.svg)](https://github.com/dguywhoknows/resume-analyzer/actions/workflows/tests.yml)

ATS-style keyword coverage, bullet-quality linting and AI rewrites that tailor your resume to a specific job.

Live: https://dguywhoknows.github.io/resume-analyzer/

## Overview

Paste (or upload as PDF) a resume and a job description. A local NLP pipeline pulls weighted keywords from the job post, giving extra weight to requirement sections and technical terms, and checks which ones your resume covers, using synonym and stem matching. Every bullet is linted for action verbs, metrics, length, passive voice and buzzwords. On top of that, AI acts as a recruiter: a structured fit review, bullet rewrites in XYZ format that never invent numbers, a tailored summary and a streamed cover letter.

## Pages

- **Analyze**
- **Resumes**
- **Jobs**
- **Letters**
- **Settings**

## Features

- Weighted keyword extraction (unigrams, bigrams, known phrases, requirement-section boosting)
- Synonym + stem-aware matching (JS → JavaScript, k8s → Kubernetes, …) with coverage gauge
- Bullet linter: action verb, quantified outcome, length, first person, passive voice, buzzwords
- Section detection (Summary, Experience, Education, Skills, Projects, Certifications)
- PDF resume import via pdf.js with line reconstruction
- AI recruiter review, per-bullet XYZ rewrites with [placeholders], tailored summary, cover letter
- Resumes page: keep multiple versions, each with a job-independent quality score broken down into bullets, sections, contact details, length and quantification
- Version compare: line-level diff (LCS) with quality and job-match deltas
- Jobs page: drag-and-drop application tracker (saved / applied / interview / offer / rejected) with live match % per job, response rate and stale-application alerts
- Letters page: saved cover letters per job with an editor, word count and one-click AI revisions (shorter, more specific, warmer, more formal)
- Apply an AI bullet rewrite straight into the resume text

## How it works

LLM calls are used for:

- Structured JSON recruiter review grounded in locally computed coverage + missing keywords
- Bullet rewriting constrained to never fabricate metrics
- Streaming cover-letter generation with tone control

Everything else (keyword extraction, matching, bullet linting, section detection, PDF parsing) runs locally in the browser.

## Getting started

No build step and no dependencies. Serve the folder with any static server:

```bash
git clone https://github.com/dguywhoknows/resume-analyzer.git
cd resume-analyzer
python -m http.server 8000
```

Then open http://localhost:8000.

### Configuration

Without an API key the app runs in demo mode with sample model output. To use a live model, open
**Settings → Configure provider** and paste a key for [Groq](https://console.groq.com/keys) or
[OpenRouter](https://openrouter.ai/keys). The key is stored in this browser's `localStorage` (namespaced to
this app) and is sent only to the selected provider.

## Testing

`src/core.js` holds the app's logic as pure functions and is covered by 10 unit tests.

```bash
node tests/run-node.js        # CI runs this on every push
```

Or open `tests/index.html` in a browser ([live](https://dguywhoknows.github.io/resume-analyzer/tests/)).

## Project structure

```
index.html           markup for every page
src/app.js           UI, page wiring and event handlers
src/core.js          pure logic with no DOM access (unit-tested)
src/demo.js          sample responses used when no API key is configured
src/lib/ai.js        LLM client: Groq / OpenRouter, streaming, JSON mode, retries
src/lib/dom.js       DOM helpers, namespaced storage, markdown renderer
src/lib/router.js    hash router and the Settings page
styles/base.css      design tokens and shared components
styles/app.css       app-specific styles
tests/               unit tests (browser runner + Node runner for CI)
```

## Tech

- Rule-based NLP: stopwords, stemming, synonym map, n-grams
- pdf.js (ES module, CDN worker)
- SVG gauge
- Keyword extraction, matching, linting, quality scoring, diff and pipeline stats in src/core.js with unit tests
- Vanilla JavaScript, no framework or bundler
- Deployed with GitHub Pages

## License

MIT
