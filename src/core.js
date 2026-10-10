/* core.js — resume/job text analysis (pure, unit-tested). */
var STOP = new Set(`a about above after again all also am an and any are as at be been being below between both but by can could did do does doing down during each etc few for from further had has have having he her here hers how i if in into is it its itself just let me more most my no nor not now of off on once only or other our ours out over own per same she should so some such than that the their them then there these they this those through to too under until up us very via was we were what when where which while who whom why will with within without would you your yours
deep knowledge similar professional senior junior engineer engineers lead leading build building own collaborate improve like used users performant expertise end-to-end looking what ll ve re salary equity remote-friendly learning budget competitive
ability able across apply benefits bonus candidate candidates company culture day days environment equal excellent experience experienced familiarity good great help ideal including join looking make must new nice opportunity plus position preferred role required requirements responsibilities skills strong team teams understanding using work working years year well world-class who wide`.split(/\s+/));
var SYN = { js: 'javascript', ts: 'typescript', k8s: 'kubernetes', postgres: 'postgresql', ml: 'machine learning', ai: 'artificial intelligence', aws: 'aws', gcp: 'google cloud', 'ci/cd': 'ci/cd', reactjs: 'react', 'react.js': 'react', nodejs: 'node.js', node: 'node.js', golang: 'go', nlp: 'natural language processing', llm: 'llms', llms: 'llms' };
var PHRASES = ['machine learning', 'data science', 'deep learning', 'computer vision', 'natural language processing', 'product management', 'project management', 'unit testing', 'system design', 'distributed systems', 'rest api', 'rest apis', 'ci/cd', 'version control', 'data analysis', 'data pipelines', 'cross-functional', 'stakeholder management', 'a/b testing', 'user research', 'customer success', 'google cloud', 'infrastructure as code', 'test automation', 'agile', 'scrum'];
var ACTION = /^(led|built|designed|developed|launched|created|implemented|architected|owned|drove|delivered|reduced|increased|improved|optimized|automated|scaled|shipped|migrated|mentored|managed|spearheaded|established|engineered|streamlined|analyzed|negotiated|won|grew|cut|saved|refactored|introduced|founded|organized|coordinated|wrote|authored|published|trained|deployed|integrated|resolved|accelerated)\b/i;
var WEAK = /\b(responsible for|helped|assisted|worked on|involved in|participated in|tasked with|duties included|in charge of)\b/i;
var BUZZ = /\b(synergy|go-getter|hard-working|team player|detail-oriented|results-driven|self-starter|think outside the box|dynamic|passionate)\b/i;

var norm = (w) => { w = w.toLowerCase(); w = SYN[w] || w; return w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w; };
var tokens = (t) => (t.toLowerCase().match(/[a-z][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || []).map((w) => w.replace(/[.]$/, ''));

function extractKeywords(jd) {
  const lines = jd.split('\n');
  const scores = new Map();
  const proper = new Set();
  lines.forEach((l) => l.replace(/^[\s\-•*]+/, '').split(/\s+/).slice(1).forEach((w) => {
    const c = w.replace(/[^A-Za-z0-9+#./]/g, '').replace(/[.]$/, '');
    if (/^[A-Z]/.test(c) && c.length > 1) proper.add(SYN[c.toLowerCase()] || c.toLowerCase());
  }));
  const technical = (k) => /[+#./]|\d/.test(k) || proper.has(k) || /^(sql|api|aws|gcp|ux|ui|go|r|aria)$/.test(k);
  let inReq = false;
  lines.forEach((line, li) => {
    if (/require|qualif|must|you have|what you.?ll bring|skills/i.test(line)) inReq = true;
    if (/benefit|perks|about us|we offer|compensation/i.test(line)) inReq = false;
    const boost = (inReq ? 1.6 : 1) * (li < lines.length * 0.6 ? 1.1 : 1);
    const toks = tokens(line);
    const lc = line.toLowerCase();
    PHRASES.forEach((p) => { if (lc.includes(p)) scores.set(p, (scores.get(p) || 0) + 2.2 * boost); });
    toks.forEach((t, i) => {
      if (STOP.has(t) || t.length < 2 || /^\d+$/.test(t)) return;
      const key = SYN[t] || t;
      if (PHRASES.some((p) => p.split(' ').includes(key) && lc.includes(p))) return;
      scores.set(key, (scores.get(key) || 0) + boost * (technical(key) ? 1.8 : 1));
      const nx = toks[i + 1];
      if (nx && !STOP.has(nx) && nx.length > 2) {
        const bg = key + ' ' + nx;
        if (jd.toLowerCase().split(bg).length > 2) scores.set(bg, (scores.get(bg) || 0) + 1.5 * boost);
      }
    });
  });
  const merged = new Map();
  for (const [k, s] of scores) {
    const nk = k.split(' ').map(norm).join(' ');
    const prev = merged.get(nk);
    if (!prev) merged.set(nk, { k, s });
    else { prev.s = Math.max(prev.s, s) + 0.3; if (k.length < prev.k.length) prev.k = k; }
  }
  return [...merged.values()]
    .filter(({ k, s }) => s >= (k.includes(' ') || technical(k) ? 1.6 : 2.6))
    .sort((a, b) => b.s - a.s).slice(0, 26).map(({ k, s }) => ({ k, w: +s.toFixed(1) }));
}

function inResume(kw, resume) {
  const r = resume.toLowerCase();
  if (r.includes(kw)) return true;
  const rs = new Set(tokens(resume).map(norm));
  return kw.split(' ').every((p) => rs.has(norm(p)));
}

function sections(resume) {
  const found = {};
  const defs = { Summary: /^(summary|profile|about|objective)/i, Experience: /^(experience|work experience|employment|professional experience)/i, Education: /^education/i, Skills: /^(skills|technical skills|technologies|tools)/i, Projects: /^projects?/i, Certifications: /^(certifications?|licenses)/i, Awards: /^(awards|honors|achievements)/i };
  resume.split('\n').forEach((l) => { const t = l.replace(/[#:*_]/g, '').trim(); for (const [k, re] of Object.entries(defs)) if (re.test(t) && t.length < 40) found[k] = true; });
  return found;
}

function lintBullet(b) {
  const words = b.split(/\s+/).filter(Boolean);
  const flags = [];
  let score = 100;
  if (!ACTION.test(b)) { score -= 20; flags.push(['warn', 'no strong action verb']); }
  if (WEAK.test(b)) { score -= 20; flags.push(['bad', 'weak phrasing']); }
  if (!/\d|%|\$/.test(b)) { score -= 25; flags.push(['warn', 'no metric']); }
  if (words.length < 8) { score -= 10; flags.push(['warn', 'too short']); }
  if (words.length > 32) { score -= 15; flags.push(['warn', 'too long']); }
  if (/\b(I|my|me)\b/.test(b)) { score -= 10; flags.push(['warn', 'first person']); }
  if (/\b(was|were|been|being)\s+\w+ed\b/i.test(b)) { score -= 10; flags.push(['warn', 'passive voice']); }
  if (BUZZ.test(b)) { score -= 10; flags.push(['bad', 'buzzword']); }
  if (!flags.length) flags.push(['good', 'strong']);
  return { score: Math.max(0, score), flags };
}

function bullets(resume) {
  return resume.split('\n').map((l) => l.trim()).filter((l) => /^[-•*▪◦·]\s+/.test(l)).map((l) => l.replace(/^[-•*▪◦·]\s+/, ''));
}


/* Full keyword match of a resume against a job description. */
function matchJob(resume, jd) {
  var kws = extractKeywords(jd).map(function (x) { return { k: x.k, w: x.w, hit: inResume(x.k, resume) }; });
  var tot = kws.reduce(function (a, x) { return a + x.w; }, 0);
  var got = kws.filter(function (x) { return x.hit; }).reduce(function (a, x) { return a + x.w; }, 0);
  return { kws: kws, pct: Math.round((100 * got) / (tot || 1)), missing: kws.filter(function (x) { return !x.hit; }).map(function (x) { return x.k; }) };
}

/* Job-independent resume quality score (0-100) with the reasons behind it. */
function resumeQuality(resume) {
  var bl = bullets(resume).map(function (b) { return lintBullet(b); });
  var secs = sections(resume);
  var words = (resume.match(/\S+/g) || []).length;
  var parts = [];
  var bulletScore = bl.length ? bl.reduce(function (a, x) { return a + x.score; }, 0) / bl.length : 0;
  parts.push(['Bullet quality', Math.round(bulletScore * 0.5), 50]);
  var core = ['Experience', 'Education', 'Skills'].filter(function (k) { return secs[k]; }).length;
  parts.push(['Core sections', core * 6 + (secs.Summary ? 2 : 0), 20]);
  var contact = (/@[\w.-]+\.\w+/.test(resume) ? 4 : 0) + (/(linkedin|github)\.com/i.test(resume) ? 3 : 0) + (/\+?\d[\d\s().-]{7,}\d/.test(resume) ? 3 : 0);
  parts.push(['Contact details', contact, 10]);
  var len = words < 150 ? 4 : words > 900 ? 6 : 10;
  parts.push(['Length (' + words + ' words)', len, 10]);
  var quant = bl.length ? bullets(resume).filter(function (b) { return /\d|%|\$/.test(b); }).length / bl.length : 0;
  parts.push(['Quantified bullets', Math.round(quant * 10), 10]);
  return { score: parts.reduce(function (a, p) { return a + p[1]; }, 0), parts: parts, words: words, bullets: bl.length };
}

/* Line diff (LCS) for comparing two resume versions: [{op:'same'|'add'|'del', text}] */
function diffLines(a, b) {
  var A = String(a).split('\n'), B = String(b).split('\n'), n = A.length, m = B.length;
  var L = [];
  for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
  for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  var out = []; i = 0; j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ op: 'same', text: A[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ op: 'del', text: A[i] }); i++; }
    else { out.push({ op: 'add', text: B[j] }); j++; }
  }
  while (i < n) out.push({ op: 'del', text: A[i++] });
  while (j < m) out.push({ op: 'add', text: B[j++] });
  return out;
}

/* Application pipeline */
var STAGES = ['saved', 'applied', 'interview', 'offer', 'rejected'];
function pipelineStats(jobs, now) {
  var by = {};
  STAGES.forEach(function (s) { by[s] = 0; });
  jobs.forEach(function (j) { if (by[j.status] != null) by[j.status]++; });
  var applied = jobs.filter(function (j) { return j.status !== 'saved'; }).length;
  var responded = jobs.filter(function (j) { return j.status === 'interview' || j.status === 'offer'; }).length;
  var stale = jobs.filter(function (j) { return j.status === 'applied' && now - (j.updated || j.created) > 14 * 864e5; }).length;
  return { by: by, applied: applied, responseRate: applied ? responded / applied : null, stale: stale };
}
function guessJobMeta(jd) {
  var lines = String(jd).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  var first = lines[0] || '';
  var parts = first.split(/\s+[—–|@-]\s+|\s+at\s+/i);
  return { title: (parts[0] || 'Untitled role').slice(0, 80), company: (parts[1] || '').slice(0, 60) };
}
